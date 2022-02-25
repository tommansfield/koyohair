/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const SortableSet = require("./util/SortableSet");
const {
	compareLocations,
	compareChunks,
	compareIterables
} = require("./util/comparators");

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Entrypoint")} Entrypoint */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */

/** @typedef {{id: number}} HasId */
/** @typedef {{module: Module, loc: DependencyLocation, request: string}} OriginRecord */

/**
 * @typedef {Object} RawChunkGroupOptions
 * @property {number=} preloadOrder
 * @property {number=} prefetchOrder
 */

/** @typedef {RawChunkGroupOptions & { name?: string }} ChunkGroupOptions */

let debugId = 5000;

/**
 * @template T
 * @param {SortableSet<T>} set set to convert to array.
 * @returns {T[]} the array format of existing set
 */
const getArray = set => Array.from(set);

/**
 * A convenience method used to sort chunks based on their id's
 * @param {ChunkGroup} a first sorting comparator
 * @param {ChunkGroup} b second sorting comparator
 * @returns {1|0|-1} a sorting index to determine order
 */
const sortById = (a, b) => {
	if (a.id < b.id) return -1;
	if (b.id < a.id) return 1;
	return 0;
};

/**
 * @param {OriginRecord} a the first comparator in sort
 * @param {OriginRecord} b the second comparator in sort
 * @returns {1|-1|0} returns sorting order as index
 */
const sortOrigin = (a, b) => {
	const aIdent = a.module ? a.module.identifier() : "";
	const bIdent = b.module ? b.module.identifier() : "";
	if (aIdent < bIdent) return -1;
	if (aIdent > bIdent) return 1;
	return compareLocations(a.loc, b.loc);
};

class ChunkGroup {
	/**
	 * Creates an instance of ChunkGroup.
	 * @param {string|ChunkGroupOptions=} options chunk group options passed to chunkGroup
	 */
	constructor(options) {
		if (typeof options === "string") {
			options = { name: options };
		} else if (!options) {
			options = { name: undefined };
		}
		/** @type {number} */
		this.groupDebugId = debugId++;
		this.options = options;
		/** @type {SortableSet<ChunkGroup>} */
		this._children = new SortableSet(undefined, sortById);
		/** @type {SortableSet<ChunkGroup>} */
		this._parents = new SortableSet(undefined, sortById);
		/** @type {SortableSet<ChunkGroup>} */
		this._asyncEntrypoints = new SortableSet(undefined, sortById);
		this._blocks = new SortableSet();
		/** @type {Chunk[]} */
		this.chunks = [];
		/** @type {OriginRecord[]} */
		this.origins = [];
		/** Indices in top-down order */
		/** @private @type {Map<Module, number>} */
		this._modulePreOrderIndices = new Map();
		/** Indices in bottom-up order */
		/** @private @type {Map<Module, number>} */
		this._modulePostOrderIndices = new Map();
		/** @type {number} */
		this.index = undefined;
	}

	/**
	 * when a new chunk is added to a chunkGroup, addingOptions will occur.
	 * @param {ChunkGroupOptions} options the chunkGroup options passed to addOptions
	 * @returns {void}
	 */
	addOptions(options) {
		for (const key of Object.keys(options)) {
			if (this.options[key] === undefined) {
				this.options[key] = options[key];
			} else if (this.options[key] !== options[key]) {
				if (key.endsWith("Order")) {
					this.options[key] = Math.max(this.options[key], options[key]);
				} else {
					throw new Error(
						`ChunkGroup.addOptions: No option merge strategy for ${key}`
					);
				}
			}
		}
	}

	/**
	 * returns the name of current ChunkGroup
	 * @returns {string|undefined} returns the ChunkGroup name
	 */
	get name() {
		return this.options.name;
	}

	/**
	 * sets a new name for current ChunkGroup
	 * @param {string} value the new name for ChunkGroup
	 * @returns {void}
	 */
	set name(value) {
		this.options.name = value;
	}

	/* istanbul ignore next */
	/**
	 * get a uniqueId for ChunkGroup, made up of its member Chunk debugId's
	 * @returns {string} a unique concatenation of chunk debugId's
	 */
	get debugId() {
		return Array.from(this.chunks, x => x.debugId).join("+");
	}

	/**
	 * get a unique id for ChunkGroup, made up of its member Chunk id's
	 * @returns {string} a unique concatenation of chunk ids
	 */
	get id() {
		return Array.from(this.chunks, x => x.id).join("+");
	}

	/**
	 * Performs an unshift of a specific chunk
	 * @param {Chunk} chunk chunk being unshifted
	 * @returns {boolean} returns true if attempted chunk shift is accepted
	 */
	unshiftChunk(chunk) {
		const oldIdx = this.chunks.indexOf(chunk);
		if (oldIdx > 0) {
			this.chunks.splice(oldIdx, 1);
			this.chunks.unshift(chunk);
		} else if (oldIdx < 0) {
			this.chunks.unshift(chunk);
			return true;
		}
		return false;
	}

	/**
	 * inserts a chunk before another existing chunk in group
	 * @param {Chunk} chunk Chunk being inserted
	 * @param {Chunk} before Placeholder/target chunk marking new chunk insertion point
	 * @returns {boolean} return true if insertion was successful
	 */
	insertChunk(chunk, before) {
		const oldIdx = this.chunks.indexOf(chunk);
		const idx = this.chunks.indexOf(before);
		if (idx < 0) {
			throw new Error("before chunk not found");
		}
		if (oldIdx >= 0 && oldIdx > idx) {
			this.chunks.splice(oldIdx, 1);
			this.chunks.splice(idx, 0, chunk);
		} else if (oldIdx < 0) {
			this.chunks.splice(idx, 0, chunk);
			return true;
		}
		return false;
	}

	/**
	 * add a chunk into ChunkGroup. Is pushed on or prepended
	 * @param {Chunk} chunk chunk being pushed into ChunkGroupS
	 * @returns {boolean} returns true if chunk addition was successful.
	 */
	pushChunk(chunk) {
		const oldIdx = this.chunks.indexOf(chunk);
		if (oldIdx >= 0) {
			return false;
		}
		this.chunks.push(chunk);
		return true;
	}

	/**
	 * @param {Chunk} oldChunk chunk to be replaced
	 * @param {Chunk} newChunk New chunk that will be replaced with
	 * @returns {boolean} returns true if the replacement was successful
	 */
	replaceChunk(oldChunk, newChunk) {
		const oldIdx = this.chunks.indexOf(oldChunk);
		if (oldIdx < 0) return false;
		const newIdx = this.chunks.indexOf(newChunk);
		if (newIdx < 0) {
			this.chunks[oldIdx] = newChunk;
			return true;
		}
		if (newIdx < oldIdx) {
			this.chunks.splice(oldIdx, 1);
			return true;
		} else if (newIdx !== oldIdx) {
			this.chunks[oldIdx] = newChunk;
			this.chunks.splice(newIdx, 1);
			return true;
		}
	}

	/**
	 * @param {Chunk} chunk chunk to remove
	 * @returns {boolean} returns true if chunk was removed
	 */
	removeChunk(chunk) {
		const idx = this.chunks.indexOf(chunk);
		if (idx >= 0) {
			this.chunks.splice(idx, 1);
			return true;
		}
		return false;
	}

	/**
	 * @returns {boolean} true, when this chunk group will be loaded on initial page load
	 */
	isInitial() {
		return false;
	}

	/**
	 * @param {ChunkGroup} group chunk group to add
	 * @returns {boolean} returns true if chunk group was added
	 */
	addChild(group) {
		const size = this._children.size;
		this._children.add(group);
		return size !== this._children.size;
	}

	/**
	 * @returns {ChunkGroup[]} returns the children of this group
	 */
	getChildren() {
		return this._children.getFromCache(getArray);
	}

	getNumberOfChildren() {
		return this._children.size;
	}

	get childrenIterable() {
		return this._children;
	}

	/**