/*!
 * send
 * Copyright(c) 2012 TJ Holowaychuk
 * Copyright(c) 2014-2016 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var createError = require('http-errors')
var debug = require('debug')('send')
var deprecate = require('depd')('send')
var destroy = require('destroy')
var encodeUrl = require('encodeurl')
var escapeHtml = require('escape-html')
var etag = require('etag')
var fresh = require('fresh')
var fs = require('fs')
var mime = require('mime')
var ms = require('ms')
var onFinished = require('on-finished')
var parseRange = require('range-parser')
var path = require('path')
var statuses = require('statuses')
var Stream = require('stream')
var util = require('util')

/**
 * Path function references.
 * @private
 */

var extname = path.extname
var join = path.join
var normalize = path.normalize
var resolve = path.resolve
var sep = path.sep

/**
 * Regular expression for identifying a bytes Range header.
 * @private
 */

var BYTES_RANGE_REGEXP = /^ *bytes=/

/**
 * Maximum value allowed for the max age.
 * @private
 */

var MAX_MAXAGE = 60 * 60 * 24 * 365 * 1000 // 1 year

/**
 * Regular expression to match a path with a directory up component.
 * @private
 */

var UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/

/**
 * Module exports.
 * @public
 */

module.exports = send
module.exports.mime = mime

/**
 * Return a `SendStream` for `req` and `path`.
 *
 * @param {object} req
 * @param {string} path
 * @param {object} [options]
 * @return {SendStream}
 * @public
 */

function send (req, path, options) {
  return new SendStream(req, path, options)
}

/**
 * Initialize a `SendStream` with the given `path`.
 *
 * @param {Request} req
 * @param {String} path
 * @param {object} [options]
 * @private
 */

function SendStream (req, path, options) {
  Stream.call(this)

  var opts = options || {}

  this.options = opts
  this.path = path
  this.req = req

  this._acceptRanges = opts.acceptRanges !== undefined
    ? Boolean(opts.acceptRanges)
    : true

  this._cacheControl = opts.cacheControl !== undefined
    ? Boolean(opts.cacheControl)
    : true

  this._etag = opts.etag !== undefined
    ? Boolean(opts.etag)
    : true

  this._dotfiles = opts.dotfiles !== undefined
    ? opts.dotfiles
    : 'ignore'

  if (this._dotfiles !== 'ignore' && this._dotfiles !== 'allow' && this._dotfiles !== 'deny') {
    throw new TypeError('dotfiles option must be "allow", "deny", or "ignore"')
  }

  this._hidden = Boolean(opts.hidden)

  if (opts.hidden !== undefined) {
    deprecate('hidden: use dotfiles: \'' + (this._hidden ? 'allow' : 'ignore') + '\' instead')
  }

  // legacy support
  if (opts.dotfiles === undefined) {
    this._dotfiles = undefined
  }

  this._extensions = opts.extensions !== undefined
    ? normalizeList(opts.extensions, 'extensions option')
    : []

  this._immutable = opts.immutable !== undefined
    ? Boolean(opts.immutable)
    : false

  this._index = opts.index !== undefined
    ? normalizeList(opts.index, 'index option')
    : ['index.html']

  this._lastModified = opts.lastModified !== undefined
    ? Boolean(opts.lastModified)
    : true

  this._maxage = opts.maxAge || opts.maxage
  this._maxage = typeof this._maxage === 'string'
    ? ms(this._maxage)
    : Number(this._maxage)
  this._maxage = !isNaN(this._maxage)
    ? Math.min(Math.max(0, this._maxage), MAX_MAXAGE)
    : 0

  this._root = opts.root
    ? resolve(opts.root)
    : null

  if (!this._root && opts.from) {
    this.from(opts.from)
  }
}

/**
 * Inherits from `Stream`.
 */

util.inherits(SendStream, Stream)

/**
 * Enable or disable etag generation.
 *
 * @param {Boolean} val
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.etag = deprecate.function(function etag (val) {
  this._etag = Boolean(val)
  debug('etag %s', this._etag)
  return this
}, 'send.etag: pass etag as option')

/**
 * Enable or disable "hidden" (dot) files.
 *
 * @param {Boolean} path
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.hidden = deprecate.function(function hidden (val) INDX( 	 Կg           (   `  �       	 �  �              .v     p \     �9    	 �@V�� ��s^�� ��s^�� ��%^�� �       �              a d d - i m p l . d . t s   	 s=    	 h X     �9    	 ӡ�� �ǀ��� �ǀ��� ������ � @      �<              a d d - i m p l . j s .v     h X     �9    	 �@V�� ��s^�� ��s^�� ��%^�� �       �              A D D - I M ~ 1 . T S Jv     h R     �9    	 1���� �&���� �&���� �T���� �                     a d d . d . t s      �A    	 ` N     �9     \���� ������ ������ ������ ��      �              a d d . j s   �p     h R     �9    	 T{&�� �0!,�� �0!,�� �j_)�� �       �              a d d . j s o n s - i �t     ` N     �9    	 �P�� ���T�� ���T�� ��T�� ��      �              a d d . m d J Jv     h T     �9    	 1���� �&���� �&���� �T���� �                     	A D D D ~ 1 . T S - i �p     h T     �9    	 T{&�� �0!,�� �0!,�� �j_)�� �       �              	A D D ~ 1 . J S O - i �v     x h     �9    	 ����  �g��� ��g��� ��@��� �                    a n a l y t i c s - i m p l . d . t s NP     x d     �9    	 /�� ���~�� ���~�� ��~�� �       �              a n a l y t i c s - i m p l . j s     �t     x d     �9    	 �mh�� ��;l�� ��;l�� ��l�� �H      E              a n a l y t i c s - l o n g . m d    �v     p ^     �9    	 -! � ���" � ���" � ���" � �       �              a n a l y t i c s . d . t s   aU     p Z     �9    	 )���� �
��� �
��� �
��� �                    a n a l y t i c s . j s       �p     p ^     �9    	 �(>�� ���A�� ���A�� ���A�� �       �              a n a l y t i c s . j s o n  NP     h X     �9    	 /�� ���~�� ���~�� ��~�� �       �              A N A L Y T ~ 1 . J S �p     p Z     �9    	 �(>�� ���A�� ���A�� ���A�� �       �              A N A L Y T ~ 1 . J S O      �t     h X     �9    	 �mh�� ��;l�� ��;l�� ��l�� �H      E              A N A L Y T ~ 1 . M D �v     h X     �9    	 ���� ��g���  �g��� ��@��� �                    A N A L Y T ~ 1 . T S aU     h X     �9    	 )���� �
��� �
��� �
��� �                     A N A L Y T ~ 2 . J S �v     h X     �9    	 -! � ���" � ���" � ���" � �       �              A N A L Y T ~ 2 . T S �v     p `     �9    	 A� � ��"� � ��"� � �k�� � �H      F              b u i l d - i m p l . d . t s [     p \     �9    	 ����� �#h��� �#h��� ��=��� �       �              b u i l d - i m p l . j s     �t     p \    �9    	 u�|�� ������ ������ ������ �       �              b u i l d - l o n g . m d    [     h X     �9    	 ����� �#h��� �#h��� ��=��� �       �              B U I L D - ~ 1 . J S �t     h X     �9    	 u�|�� ������ ������ ������ �       �              B U I L D - ~ 1 . M D �v     h X     �9    	 A� � ��"� � ��"� � �k�� � �H      F              B U I L D - ~ 1 . T S w     h V     �9    	 M�� �X�
� �X�
� �X�
� �       S              
b u i l d . d . t s  �[     h R     �9    	 [�=�� ���T�� ���T�� ���T�� ��      �              b u i l d . j s                     h X     �9    	 ����� ��o��� ��o��� �"��� �       e              d e p l o y . j s o n �`     h X     �9    	 � {�� �k���� �k���� ����� �       !              D E P L O Y ~ 1 . J S �q     p Z     �9    	 ����� ��o��� ��o��� �"��� �       e              D E P L O Y ~ 1 . J S O      �a     h X     �9    	 ��� ��2�� ��2�� ��2�� �       �             d o c - i m p l . j s Yb     ` N     �9    	 R�~�� �@��� �@��� �@��� �`      \              d o c . j s   �q     h R     �9    	 ���� �u���� �u���� �u���� �       1              d o c . j s o n . j s �q     h T     �9    	 ���� �u���� �u���� �u���� �       1              	D O C ~ 1 . J S O j s �b     h X     �9    	 +O��� ����� ����� ����� �       9              e 2 e - i m p l . j s                                                                              INDX( 	 _rn          (   �  �          �  �s           r     h R     �9    	 ����� �o���� �o���� �o���� ��      �              e 2 e . j s o n g g - jx     h T     �9    	 A�� ��/�� ��/�� ���� �                     	E 2 E D ~ 1 . T S g - r     h T     �9    	 ����� �o���� �o���� �o���� ��      �              	E 2 E ~ 1 . J S O g - �x     � j     �9    	 t�� �̟�� �̟�� ��x�� ��      �              e a s t e r - e g g - i m p l . d . t s      �c     x f     �9    	 ���� ������ ������ ������ �       L              e a s t e r - e g g - i m p l . j s   �x     p `     �9    	 ���� �M��� �M��� �M��� �@      >              e a s t e r - e g g . d . t s d     p \     �9    	 ����� ����� ����� ����� ��      �              e a s t e r - e g g . j s     9r     p `     �9    	 �s��� �;X��� �;X��� �;X��� �0      0              e a s t e r - e g g . j s o n �c     h X     �9    	 ���� ������ ������ ������ �      L              E A S T E R ~ 1 . J S 9r     p Z     �9    	 �s��� �;X��� �;X��� �;X��� �0      0              E A S T E R ~ 1 . J S O      �x     h X     �9    	 t�� �̟�� �̟�� ��x�� ��      �              E A S T E R ~ 1 . T S d     h X     �9    	 ����� ����� ����� ����� ��      �              E A S T E R ~ 2 . J S �x     h X     �9    	 ���� �M��� �M��� �M��� �@      >              E A S T E R ~ 2 . T S �x     � n     �9    	 {�	� ��B� ��B�  ��� �       N              e x t r a c t - i 1 8 n - i m p l . d . t s   �d     � j     �9    	 J4�� ���:�� ���:�� ��=:�� �       4              e x t r a c t - i 1 8 n - i m p l . j s       �x     x d     �9    	 �� �\v� �J�� �\v� �       �              e x t r a c t - i 1 8 n . d . t s    �d     p `     �9    	 PBN�� ��;X�� ��;X�� ��;X�� ��      �              e x t r a c t - i 1 8 n . j s               �9    	 �e��� �� �� �� �� �� �� ��      �             e x t r a c t - i 1 8 n . j s o n     �d     h X     �9    	 J4�� ���:�� ���:�� ��=:�� �       4              E X T R A C ~ 1 . J S [r     p Z     �9    	 �e��� �� �� �� �� �� �� ��      �              E X T R A C ~ 1 . J S O      �x     h X     �9    	 {�	� ��B� ��B� ���� �       N              E X T R A C ~ 1 . T S �d     h X     �9    	 PBN�� ��;X�� ��;X�� ��;X�� ��      �              E X T R A C ~ 2 . J S �x     h X     �9    	 �� �\v�  J�� �\v� �       �              E X T R A C ~ 2 . T S y     x f     �9    	 ��/� ���/� ���/� ���/� �                        g e n e r a t e - i m p l . d . t s   �e     x b     �9    	 ����� �\���� �\���� ��6��� �       �              g e n e r a t e - i m p l . j s       �e     h X     �9    	 ����� ��u��� ��u��� ��u��� ��      �              g e n e r a t e . j s �r     p \     �9    	 OT�� ���	�� ���	�� ���	�� �       >              g e n e r a t e . j  o n    �e     h X     �9    	 ����� �\���� �\���� ��6��� �       �              G E N E R A ~ 1 . J S �r     p Z     �9    	 OT�� ���	�� ���	�� ���	�� �       >              G E N E R A ~ 1 . J S O       3f     p Z     �9    	 r��� ������ ������ ������ �       �              h e l p - i m p l . j s       3f     h X     �9    	 r��� ������ ������ ������ �       �              H E L P - I ~ 1 . J S Mu     p Z     �9    	 L��� ����� ����� ����� ��       |              h e l p - l o n g . m d T     Mu     h X     �9    	 L��� ����� ����� ����� ��       |               H E L P - L ~ 1 . M D �f     ` P     �9    	 ���� ���� ���� ���� ��      �              h e l p . j s �r     h T     �9    	 ���� ����� ����� ����� �x      w              	h e l p . j s o n � ��r     h V     �9    	 ���� ����� ����� ����� �x      w              
H E L P ~ 1 . J S O �                                                             INDX( 	 �x          (   �  �       	 	     i           j     h X     �9    	 ����� ����� ����� �#���� �        
              L I N T - I ~ 1 . J S :z     h X     �9    	 @�� �.K�� �.K�� �9$�� �       �              L I N T - I ~ 1 . T S lu     p Z     �9    	 �:��� ����� ��/��� ������ �       �              l i n t - l o n g . m d T     lu     h X     �9    	 �:��� ����� ��/��� ������ �       �              L I N T - L ~ 1 . M D Sz     h T     �9     Dk�� �|�� �|�� �U�� �       P              	l i n t . d . t s    Ij     ` P     �9    	 ����� �]f��� �]f��� �]f��� ��      �              l i n t . j s �r     h T     �9    	 �&*�� �#^+�� �#^+�� �97+�� �       f              	l i n t . j s o n j s Sz     h V     �9    	 Dk�� �|�� �|�� �U�� �       P              
L I N T D ~ 1 . T S s �r     h V     �9    	 �&*�� �#^+�� �#^+�� �97+�� �       f              
L I N T ~ 1 . J S O s �z     p \     �9     XZ�� ���� ���� ����� �       �              n e w - i m p l . d . t s    �j     h X     �9    	 ��(�� ���.�� ���.�� ���.�� �       [              n e w - i m p l . j s �z     h X     �9    	 XZ�� ���� ���� ����� �       �              N E W - I M ~ 1 . T S �z     h R     �9    	 ���� �rZ�� �rZ�� ���� �       �              n e w . d . t s      �j     ` N     �9    	 ��B�� ���H�� ���H�� ���H�� ��      �              n e w . j s   �r     h R    �9    	 �6�� �թ;�� �թ;�� �S$:�� �       �              n e w . j s o n . j s �u     ` N     �9    	 � �� �.�� �.�� ��� �       v              n e w . m d J �z     h T     �9    	 ���� �rZ�� �rZ�� ���� �       �              	N E W D ~ 1 . T S j s �r     h T     �9    	 �6�� �թ;�� �թ;�� �S$:�� �       �              	N E W ~ 1 . J S O j s \{     p \     �9    	 _g&� ��$)� ��$)� ���(� �                     r u n - i m p l . d . t s    �l     h X     �9    	 '�H�� �m�K�� �m�K�� �[�K�� ��      �              r u n - i m p l . j s \{     h X     �9    	 _g&� ��$)� ��$)� ���(� �                     R U N - I M ~ 1 . T S �u     h X     �9    	 3�4�� �A�6�� �A�6�� �X�6�� �                     r u n - l o n g . m d s{     h R     �9    	 �2� �i�4� �i�4� �}Z4� �       l              r u n . d . t s      m     ` N     �9    	 ��`�� ���z�� ���z�� ���z�� ��      �              r u n . j s   ds     h R     �9    	 ��l�� ��n�� ��n�� �)�n�� �       x              r u n . j s o n p l . s{     h T     �9    	 �2� �i�4� �i�4� �}Z4� �       l              	R U N D ~ 1 . T S l . ds     h T     �9    	 ��l�� ��n�� ��n�� �)�n�� �       x              	R U N ~ 1 . J S O l . �{     p `     �9    	 %�� ���� ���� ���� �       _              s e r v e - i m p l . d . t s n     p \     �9    	 y��� �{��� �o���� ��G��� �       �              s e r v e -  m p l . j s     n     h X     �9    	 y��� �{��� �o���� ��G��� �       �              S E R V E - ~ 1 . J S �{     h X     �9    	 %�� ���� ���� ���� �       _              S E R V E - ~ 1 . T S �{     h V     �9    	 U��� �n �� �n �� �ҧ�� �       �              
s e r v e . d . t s   Cn     h R     �9    	 Y7��� ������ �y���� ������ ��      �              s e r v e . j s                     �9    	 ~���� �>���� �>���� �>���� �        R             v e r s i o n - i m p l . j s p     h V     �9    	 m���� ��?��� ��?��� ��?��� ��      �              
v e r s i o n . j s S mt     p Z     �9    	 y4�� ���:�� ���:�� ���:�� �`      [              v e r s i o n . j s o n       �o     h X     �9    	 ~���� �>���� �>���� �>���� �        R              V E R S I O ~ 1 . J S mt     p Z     �9    	 y4�� ���:�� ���:�� ���:�� �`      [              V E R S I O ~ 1 . J S O                                                    INDX( 	 ��k          (   �  �        ~      c C         w     h X     �9    	 M�� �X�
� �X�
� �X�
� �       S              B U I L D D ~ 1 . T S �p     h X     �9    	 3#T�� ��GV�� ��GV�� ��GV�� �                     B U I L D ~ 1 . J S O �w     x b     �9    	 1V� �S<Y� �S<Y� �bY� �                    c o n f i g - i m p l . d . t s      '_     p ^     �9    	 �b;�� ���}�� ���}�� �k�v�� �        �              c o n f i g - i m p l . j s   �t     p ^     �9    	 _��� ��̣�� ��̣�� �ե��� �       �              c o n f i g - l o n g . m d  �w     h X     �9    	 ΰk� �P@p� �P@p� ���o� �       �              c o n f i g . d . t s �_     h T     �9    	 �=��� ������ ������ ������ ��      �              	c o n f i g . j s J S vq     h X     �9    	 ���� �:���� �:���� �	�� �                     c o n f i g . j s o n '_     h X     �9    	 �b;�� ���}�� ���}�� �k�v�� �        �              C O N F I G  1 . J S vq     p Z     �9    	 ���� �:���� �:���� �	�� �                     C O N F I G ~ 1 . J S O j s   �t     h X     �9    	 _��� ��̣�� ��̣�� �ե��� �       �              C O N F I G ~ 1 . M D �w     h X     �9    	 1V� �S<Y� �S<Y� �bY� �                    C O N F I G ~ 1 . T S �w     h X     �9    	 ΰk� �P@p� �P@p� ���o� �       �              C O N F I G ~ 2 . T S �q     x b     �9    	 |^��� �1���� �1���� �Cd��� �       �	             d e f i n i t i o n s . j s o n      �q     p Z     �9    	 |^��� �1���� �1���� �Cd��� �       �	              D E F I N I ~ 1 . J S O j s   �w     x b     �9    	 Af�� ����� ��ӎ� ����� �       �              d e p l o y - i m p l . d . t s      �`     p ^     �9    	 � {�� �k���� �k���� ����� �       !              d e p l o y - i m p l . j s   u     p ^     �9    	 HZ��� �d���� �d���� �ye��� �       �              d e p l o y - l o n g . m d               �9    	 %ٓ� ����� ����� �^i�� �       s              d e p l o y . d . t s ha     h T     �9    	 ���� �I���� �I���� �I���� ��      �              	d e p l o y . j s J S �q     h X     �9    	 ����� ��o��� ��o��� �"��� �       e              d e p l o y . j s o n �`     h X     �9    	 � {�� �k���� �k���� ����� �       !              D E P L O Y ~ 1 . J S �q     p Z     �9    	 ����� ��o��� ��o��� �"��� �       e              D E P L O Y ~ 1 . J S O      u     h X     �9    	 HZ��� �d���� �d���� �ye��� �       �              D E P L O Y ~ 1 . M D �w     h X     �9    	 Af�� ����� ��ӎ� ����� �       �              D E P L O Y ~ 1 . T S �w     h X     �9    	 %ٓ� ����� ����� �^i�� �       s              D E P L O Y ~ 2 . T S x     p \     �9    	 �٥� �B��� �B��� �B��� ��      �              d o c - i m p l . d . t s    �a     h X     �9    	 ��� ��2�� ��2�� ��2�� �       �              d o  - i m p l . j s x     h X     �9    	 �٥� �B��� �B��� �B��� ��      �              D O C - I M ~ 1 . T S 4x     h R     �9    	 ���� ��c�� ��c�� ���� �       a              d o c . d . t s      Yb     ` N     �9    	 R�~�� �@��� �@��� �@��� �`      \              d o c . j s   �q     h R     �9    	 ���� �u���� �u���� �u���� �       1              d o c . j s o n . j s 4x     h T     �9    	 ���� ��c�� ��c�� ���� �       a              	D O  D ~ 1 . T S j s �q     h T     �9    	 ���� �u���� �u���� �u���� �       1              	D O C ~ 1 . J S O j s Px     p \     �9    	 2�� �2�� �2�� �2�� �                        e 2 e - i m p l . d . t s    �b     h X     �9    	 +O��� ����� ����� ����� �       9              e 2 e - i m p l . j s .u     h X     �9    	 �]��� �O���� �O���� �O���� ��      �              e 2 e - l o n g . m d                                                                      {"ast":null,"code":"import { Observable } from '../Observable';\nimport { async as asyncScheduler } from '../scheduler/async';\nimport { isScheduler } from '../util/isScheduler';\nimport { isValidDate } from '../util/isDate';\nexport function timer(dueTime = 0, intervalOrScheduler, scheduler = asyncScheduler) {\n  let intervalDuration = -1;\n\n  if (intervalOrScheduler != null) {\n    if (isScheduler(intervalOrScheduler)) {\n      scheduler = intervalOrScheduler;\n    } else {\n      intervalDuration = intervalOrScheduler;\n    }\n  }\n\n  return new Observable(subscriber => {\n    let due = isValidDate(dueTime) ? +dueTime - scheduler.now() : dueTime;\n\n    if (due < 0) {\n      due = 0;\n    }\n\n    let n = 0;\n    return scheduler.schedule(function () {\n      if (!subscriber.closed) {\n        subscriber.next(n++);\n\n        if (0 <= intervalDuration) {\n          this.schedule(undefined, intervalDuration);\n        } else {\n          subscriber.complete();\n        }\n      }\n    }, due);\n  });\n}","map":{"version":3,"sources":["D:/Code/Projects/koyohair/node_modules/rxjs/dist/esm/internal/observable/timer.js"],"names":["Observable","async","asyncScheduler","isScheduler","isValidDate","timer","dueTime","intervalOrScheduler","scheduler","intervalDuration","subscriber","due","now","n","schedule","closed","next","undefined","complete"],"mappings":"AAAA,SAASA,UAAT,QAA2B,eAA3B;AACA,SAASC,KAAK,IAAIC,cAAlB,QAAwC,oBAAxC;AACA,SAASC,WAAT,QAA4B,qBAA5B;AACA,SAASC,WAAT,QAA4B,gBAA5B;AACA,OAAO,SAASC,KAAT,CAAeC,OAAO,GAAG,CAAzB,EAA4BC,mBAA5B,EAAiDC,SAAS,GAAGN,cAA7D,EAA6E;AAChF,MAAIO,gBAAgB,GAAG,CAAC,CAAxB;;AACA,MAAIF,mBAAmB,IAAI,IAA3B,EAAiC;AAC7B,QAAIJ,WAAW,CAACI,mBAAD,CAAf,EAAsC;AAClCC,MAAAA,SAAS,GAAGD,mBAAZ;AACH,KAFD,MAGK;AACDE,MAAAA,gBAAgB,GAAGF,mBAAnB;AACH;AACJ;;AACD,SAAO,IAAIP,UAAJ,CAAgBU,UAAD,IAAgB;AAClC,QAAIC,GAAG,GAAGP,WAAW,CAACE,OAAD,CAAX,GAAuB,CAACA,OAAD,GAAWE,SAAS,CAACI,GAAV,EAAlC,GAAoDN,OAA9D;;AACA,QAAIK,GAAG,GAAG,CAAV,EAAa;AACTA,MAAAA,GAAG,GAAG,CAAN;AACH;;AACD,QAAIE,CAAC,GAAG,CAAR;AACA,WAAOL,SAAS,CAACM,QAAV,CAAmB,YAAY;AAClC,UAAI,CAACJ,UAAU,CAACK,MAAhB,EAAwB;AACpBL,QAAAA,UAAU,CAACM,IAAX,CAAgBH,CAAC,EAAjB;;AACA,YAAI,KAAKJ,gBAAT,EAA2B;AACvB,eAAKK,QAAL,CAAcG,SAAd,EAAyBR,gBAAzB;AACH,SAFD,MAGK;AACDC,UAAAA,UAAU,CAACQ,QAAX;AACH;AACJ;AACJ,KAVM,EA