/*
---

name: Meio.Mask

description: The base component for the Meio.Mask plugin.

authors:
  - Fábio Miranda Costa

requires:
  - Core/Class.Extras
  - Core/Element.Event
  - Core/Element.Style
  - More/Element.Forms

license: MIT-style license

provides: [Meio.Mask]

...
*/
/*
---

script: Element.Forms.js

name: Element.Forms

description: Extends the Element native object to include methods useful in managing inputs.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Element
  - /String.Extras
  - /MooTools.More

provides: [Element.Forms]

...
*/

Element.implement({

	tidy: function(){
		this.set('value', this.get('value').tidy());
	},

	getTextInRange: function(start, end){
		return this.get('value').substring(start, end);
	},

	getSelectedText: function(){
		if (this.setSelectionRange) return this.getTextInRange(this.getSelectionStart(), this.getSelectionEnd());
		return document.selection.createRange().text;
	},

	getSelectedRange: function(){
		if (this.selectionStart != null){
			return {
				start: this.selectionStart,
				end: this.selectionEnd
			};
		}

		var pos = {
			start: 0,
			end: 0
		};
		var range = this.getDocument().selection.createRange();
		if (!range || range.parentElement() != this) return pos;
		var duplicate = range.duplicate();

		if (this.type == 'text'){
			pos.start = 0 - duplicate.moveStart('character', -100000);
			pos.end = pos.start + range.text.length;
		} else {
			var value = this.get('value');
			var offset = value.length;
			duplicate.moveToElementText(this);
			duplicate.setEndPoint('StartToEnd', range);
			if (duplicate.text.length) offset -= value.match(/[\n\r]*$/)[0].length;
			pos.end = offset - duplicate.text.length;
			duplicate.setEndPoint('StartToStart', range);
			pos.start = offset - duplicate.text.length;
		}
		return pos;
	},

	getSelectionStart: function(){
		return this.getSelectedRange().start;
	},

	getSelectionEnd: function(){
		return this.getSelectedRange().end;
	},

	setCaretPosition: function(pos){
		if (pos == 'end') pos = this.get('value').length;
		this.selectRange(pos, pos);
		return this;
	},

	getCaretPosition: function(){
		return this.getSelectedRange().start;
	},

	selectRange: function(start, end){
		if (this.setSelectionRange){
			this.focus();
			this.setSelectionRange(start, end);
		} else {
			var value = this.get('value');
			var diff = value.substr(start, end - start).replace(/\r/g, '').length;
			start = value.substr(0, start).replace(/\r/g, '').length;
			var range = this.createTextRange();
			range.collapse(true);
			range.moveEnd('character', start + diff);
			range.moveStart('character', start);
			range.select();
		}
		return this;
	},

	insertAtCursor: function(value, select){
		var pos = this.getSelectedRange();
		var text = this.get('value');
		this.set('value', text.substring(0, pos.start) + value + text.substring(pos.end, text.length));
		if (select !== false) this.selectRange(pos.start, pos.start + value.length);
		else this.setCaretPosition(pos.start + value.length);
		return this;
	},

	insertAroundCursor: function(options, select){
		options = Object.append({
			before: '',
			defaultMiddle: '',
			after: ''
		}, options);

		var value = this.getSelectedText() || options.defaultMiddle;
		var pos = this.getSelectedRange();
		var text = this.get('value');

		if (pos.start == pos.end){
			this.set('value', text.substring(0, pos.start) + options.before + value + options.after + text.substring(pos.end, text.length));
			this.selectRange(pos.start + options.before.length, pos.end + options.before.length + value.length);
		} else {
			var current = text.substring(pos.start, pos.end);
			this.set('value', text.substring(0, pos.start) + options.before + current + options.after + text.substring(pos.end, text.length));
			var selStart = pos.start + options.before.length;
			if (select !== false) this.selectRange(selStart, selStart + current.length);
			else this.setCaretPosition(selStart + text.length);
		}
		return this;
	}

});



(function(global, $){

    var Meio = global.Meio || {};

    // credits to Jan Kassens
    Object.append(Element.NativeEvents, {
        'paste': 2, 'input': 2
    });
    Element.Events.paste = {
        base : (Browser.Platform.ios || Browser.opera || (Browser.firefox && Browser.version < 3))? 'input': 'paste',
        condition: function(e){
            this.fireEvent('paste', e, 1);
            return false;
        }
    };

    Meio.Mask = new Class({

        Implements: [Options, Events],

        options: {
            autoTab: false

            //onInvalid: function(){},
            //onValid: function(){},

            //REVERSE MASK OPTIONS
            //autoSetSize: false,
            //autoEmpty: false,
            //alignText: true,
            //symbol: '',
            //precision: 2,
            //decimal: ',',
            //thousands: '.',
            //maxLength: 18

            //REPEAT MASK OPTIONS
            //mask: '',
            //maxLength: 0 // 0 for infinite

            //REGEXP MASK OPTIONS
            //regex: null
        },

        initialize: function(options){
            this.setOptions(options);
            this.ignore = false;
            this.bound = {focus: 0, blur: 0, keydown: 0, keypress: 0, paste: 0};
        },

        link: function(element){
            element = $(element);
            if (element.get('tag') != 'input') return;
            if (this.element) this.unlink();
            this.element = element;
            return this.attach();
        },

        unlink: function(){
            return this.detach();
        },

        attach: function(){
            var self = this;
            if (this.maxlength == null) this.maxlength = this.element.get('maxLength');
            this.element.removeAttribute('maxLength');
            for (var evt in this.bound){
                this.bound[evt] = (function(onMask, func){
                    return function(e) {
                        return onMask.call(self, e, func);
                    };
                })(this.onMask, this[evt]);
                this.element.addEvent(evt, this.bound[evt]);
            }
            var elementValue = this.element.get('value');
            if (elementValue != '') this.element.set('value', this.mask(elementValue));
            return this;
        },

        detach: function(){
            var maxlength = this.maxlength;
            if (maxlength != null) this.element.set('maxlength', maxlength);
            for (var evt in this.bound){
                this.element.removeEvent(evt, this.bound[evt]);
                this.bound[evt] = 0;
            }
            this.element = null;
            return this;
        },

        dettach: function(){ this.detach(); }, // deprecated (incorrect syntax, sorry), use detach instead

        onMask: function(e, func){
            if (this.element.get('readonly')) return true;
            var o = {}, event = e.event, keyCode = (e.type == 'paste') ? null : event.keyCode;
            o.range = this.element.getSelectedRange();
            o.isSelection = (o.range.start !== o.range.end);
            // 8 == backspace && 46 == delete && 127 == iphone's delete
            o.isDelKey = (keyCode == 46 && (event.type != 'keypress' || ((Browser.firefox || Browser.opera) && !event.which)));
            o.isBksKey = (keyCode == 8 || (Browser.Platform.ios && e.code == 127));
            o.isRemoveKey = (o.isBksKey || o.isDelKey);
            func && func.call(this, e, o);
            return true;
        },

        keydown: function(e, o){
	        this.ignore = (Meio.Mask.ignoreKeys[e.code] && !o.isRemoveKey) || e.control || e.meta || e.alt;
            if (this.ignore || o.isRemoveKey){
                var keyRepresentation = Meio.Mask.ignoreKeys[e.code] || '';
                this.fireEvent('valid', [this.element, e.code, keyRepresentation]);
	            if(e.key=='enter') this.blur(e, o);
            }
            return (Meio.Mask.onlyKeyDownRepeat && o.isRemoveKey) ? this.keypress(e, o) : true;
        },

        keypress: function(e, o){
            if (this.options.autoTab && this.shouldFocusNext()){
                var nextField = this.getNextInput();
                if (nextField){
                    nextField.focus();
                    if (nextField.select) nextField.select();
                }
            }
            return true;
        },

        focus: function(e, o){
            var element = this.element;
            element.store('meiomask:focusvalue', element.get('value'));
        },

        blur: function(e, o){
            var element = this.element;
            if (e && element.retrieve('meiomask:focusvalue') != element.get('value')){
                element.fireEvent('change');
            }
        },

        getCurrentState: function(e, o){
            var _char = String.fromCharCode(e.code),
                elValue = this.element.get('value');
            var start = o.range.start, end = o.range.end;
            if (o.isRemoveKey && !o.isSelection) {
                o.isDelKey ? end++ : start--;
            }
            return {value: elValue.substring(0, start) + (o.isRemoveKey ? '' : _char) + elValue.substring(end),
                _char: _char, start: start, end: end};
        },

        setSize: function(){
            if (!this.element.get('size')) this.element.set('size', this.maskArray.length);
        },

        shouldFocusNext: function(){
            var maxLength = this.options.maxLength;
            return maxLength && this.element.get('value').length >= maxLength;
        },

        getNextInput: function(){
            var fields = Array.from(this.element.form.elements), field;
            for (var i = fields.indexOf(this.element) + 1, l = fields.length; i < l; i++){
                field = fields[i];
                if (this.isFocusableField(field)) return $(field);
            }
            return null;
        },

        isFocusableField: function(field){
            return (field.offsetWidth > 0 || field.offsetHeight > 0) && // is it visible?
                field.nodeName.toLowerCase() != 'fieldset';
        },

        isFixedChar: function(_char){
            return !Meio.Mask.matchRules.contains(_char);
        },

        mask: function(str){
            return str;
        },

        unmask: function(str){
            return str;
        }

    });

    Meio.Mask.extend({

        matchRules: '',

        rulesRegex: new RegExp(''),

        rules: {},

        setRule: function(ruleKey, properties){
            var rules = {};
            rules[ruleKey] = properties;
            this.setRules(rules);
        },

        setRules: function(rulesObj){
            Object.append(this.rules, rulesObj);
            var rulesKeys = [];
            for (var rule in rulesObj) rulesKeys.push(rule);
            this.matchRules += rulesKeys.join('');
            this.recompileRulesRegex();
        },

        removeRule: function(rule){
            delete this.rules[rule];
            this.matchRules = this.matchRules.replace(rule, '');
            this.recompileRulesRegex();
        },

        removeRules: function(){
            var rulesToRemove = Array.flatten(arguments);
            for (var i=rulesToRemove.length; i--;) this.removeRule(rulesToRemove[i]);
        },

        recompileRulesRegex: function(){
            this.rulesRegex.compile('[' + this.matchRules.escapeRegExp() + ']', 'g');
        },

        createMasks: function(type, masks){
            type = type.capitalize();
            for (var mask in masks){
                this[type][mask.camelCase().capitalize()] = new Class({
                    Extends: this[type],
                    options: masks[mask]
                });
            }
        },

        // credits to Christoph Pojer's (cpojer) http://cpojer.net/
        upTo: function(number){
            number = '' + number;
            return function(value, index, _char){
                if (value.charAt(index-1) == number[0])
                    return (_char <= number[1]);
                return true;
            };
        },

        // http://unixpapa.com/js/key.html
        // if only the keydown auto-repeats
        // if you have a better implementation of this detection tell me
        onlyKeyDownRepeat: !!(Browser.ie || Browser.chrome || (Browser.safari && Browser.version >= 4))

    }).extend(function(){
        var ignoreKeys;
        var desktopIgnoreKeys = {
            8  : 'backspace',
            9  : 'tab',
            13 : 'enter',
            16 : 'shift',
            17 : 'control',
            18 : 'alt',
            27 : 'esc',
            33 : 'page up',
            34 : 'page down',
            35 : 'end',
            36 : 'home',
            37 : 'left',
            38 : 'up',
            39 : 'right',
            40 : 'down',
            45 : 'insert',
            46 : 'delete',
            224: 'command'
        },
        iphoneIgnoreKeys = {
            10 : 'go',
            127: 'delete'
        };

        if (Browser.Platform.ios){
            ignoreKeys = iphoneIgnoreKeys;
        } else {
            // f1, f2, f3 ... f12
            for (var i=1; i<=12; i++) desktopIgnoreKeys[111 + i] = 'f' + i;
            ignoreKeys = desktopIgnoreKeys;
        }
        return {ignoreKeys: ignoreKeys};
    }())
    .setRules((function(){
        var rules = {
            'z': {regex: /[a-z]/},
            'Z': {regex: /[A-Z]/},
            'a': {regex: /[a-zA-Z]/},
            '*': {regex: /[0-9a-zA-Z]/},
            'H': {regex: /[0-9a-fA-F]/}, // hexadecimal
            '@': {regex: /[0-9a-zA-ZçáàãâéèêíìóòõôúùüñÇÁÀÃÂÉÈÊÍÌÓÒÕÔÚÙÜÑ]/}, // 'i' regex modifier doesnt work well with unicode chars
            'h': {regex: /[0-9]/, check: Meio.Mask.upTo(23)},
            'd': {regex: /[0-9]/, check: Meio.Mask.upTo(31)},
            'm': {regex: /[0-9]/, check: Meio.Mask.upTo(12)}
        };
        for (var i=0; i<=9; i++) rules[i] = {regex: new RegExp('[0-' + i + ']')};
        return rules;
    })());

    global.Meio = Meio;

})(this, document.id);



/*
---

name: Meio.Mask.Fixed

description: A mask used for fixed values like date, time, phone, etc.

authors:
 - Fábio Miranda Costa

requires:
 - Meio.Mask

license: MIT-style license

provides: [Meio.Mask.Fixed]

...
*/

Meio.Mask.Fixed = new Class({

    Extends: Meio.Mask,

    options: {
        autoSetSize: false,
        placeholder: '_',
        removeIfInvalid: false, // removes the value onblur if the input is not valid
        removeInvalidTrailingChars: true
    },

    initialize: function(options){
        this.parent(options);
        this.slice = Array.prototype.slice;
        this.maskArray = this.options.mask.split('');
        this.maskMold = this.options.mask.replace(Meio.Mask.rulesRegex, this.options.placeholder).split('');
        this.maskMoldEmpty = this.slice.call(this.maskMold);
        this.validIndexes = [];
        this.maskArray.each(function(c, i){
            if (!this.isFixedChar(c)) this.validIndexes.push(i);
        }, this);
        this.createUnmaskRegex();
    },

    link: function(element){
        this.parent(element);
        var elementValue = this.element.get('value');
        if (elementValue != ''){
            var maskedValue = this.mask(elementValue);
            for (var i = maskedValue.length; i--;){
                this.maskMold[i] = maskedValue.charAt(i);
            }
        }
        if (this.options.autoSetSize) this.setSize();
        return this;
    },

    focus: function(e, o){
		var retApply = this.applyMask(this.element.get('value'),0);
  		this.maskMold = retApply.value;

        var elementValue = this.maskMold.join('');
        this.element.set('value', elementValue);
        this.focusTimeout = this.element.setCaretPosition.delay(0, this.element, [this.getLastValidIndex(elementValue)]);
        this.parent(e, o);
    },

    blur: function(e, o){
        this.parent(e, o);
        clearTimeout(this.focusTimeout);
        var elementValue = this.element.get('value');
        if (this.options.removeIfInvalid){
            if (elementValue.contains(this.options.placeholder)){
                this.maskMold = this.slice.call(this.maskMoldEmpty, 0);
                this.element.set('value', '');
            }
            return true;
        }
        if (this.options.removeInvalidTrailingChars) this.element.set('value', this.removeInvalidTrailingChars(elementValue));
        return true;
    },

    keypress: function(e, o){
        if (this.ignore) return true;
        e.preventDefault();

        var c = String.fromCharCode(e.code),
            maskArray = this.maskArray,
            start, i, returnFromTestEntry;

        if(!o.isSelection){
            // no text selected
            var finalRangePosition;
            if (o.isBksKey){
                do {
                    start = this.validIndexes.indexOf(--o.range.start);
                } while (start == -1 && o.range.start >= 0);
                finalRangePosition = this.validIndexes[start] || 0;
            } else {
                do {
                    start = this.validIndexes.indexOf(o.range.start++);
                } while (start == -1 && o.range.start < maskArray.length);
                finalRangePosition = (start == -1) ? this.maskMold.length : this.validIndexes[start + 1];
            }

            i = this.validIndexes[start];
            if (!(returnFromTestEntry = this.testEvents(i, c, e.code, o.isRemoveKey))) return true;
            if (typeof returnFromTestEntry == 'string') c = returnFromTestEntry;
            this.maskMold[i] = (o.isRemoveKey) ? this.options.placeholder : c;

            var newCarretPosition = (finalRangePosition == null) ? this.maskMold.length : finalRangePosition;
            this.element.set('value', this.maskMold.join(''))
                .setCaretPosition(newCarretPosition);

        } else {

            var rstart = o.range.start,
                rend = o.range.end,
                end;

            // text selected
            do {
                start = this.validIndexes.indexOf(o.range.start++);
            } while(start == -1 && o.range.start < maskArray.length);
            do {
                end = this.validIndexes.indexOf(o.range.end++);
            } while(end == -1 && o.range.end < maskArray.length);

            // if  you select a fixed char it will ignore your input
            if (!(end - start)) return true;

            // removes all the chars into the range
            for (i=rstart; i<rend; i++){
                this.maskMold[i] = this.maskMoldEmpty[i];
            }

            if (!o.isRemoveKey){
                i = this.validIndexes[start];
                if (!(returnFromTestEntry = this.testEvents(i, c, e.code, o.isRemoveKey))) return true;
                if (typeof returnFromTestEntry == 'string') c = returnFromTestEntry;
                this.maskMold[i] = c;
                start++;
            }

            this.element.set('value', this.maskMold.join(''));
            this.element.setCaretPosition(this.validIndexes[start]);
        }
        return this.parent();
    },

    paste: function(e, o){
        var retApply = this.applyMask(this.element.get('value'), o.range.start);
        this.maskMold = retApply.value;
        this.element.set('value', this.maskMold.join(''))
            .setCaretPosition(retApply.rangeStart);
        return true;
    },

    getLastValidIndex: function(elementValue){
        var lastValidIndex = elementValue.length,
            placeholder = this.options.placeholder,
            i = elementValue.length - 1,
            cont;
        while (i >= 0){
            cont = false;
            while (this.isFixedChar(elementValue.charAt(i)) && elementValue.charAt(i) !== placeholder){
                if (i == 0) lastValidIndex = 0;
                cont = true;
                i--;
            }
            while (elementValue.charAt(i) === placeholder){
                lastValidIndex = i;
                cont = true;
                i--;
            }
            if (!cont) break;
        }
        return lastValidIndex;
    },

    removeInvalidTrailingChars: function(elementValue){
        return elementValue.substring(0, this.getLastValidIndex(elementValue));
    },

    testEvents: function(index, _char, code, isRemoveKey){
        var maskArray = this.maskArray,
            rule = Meio.Mask.rules[maskArray[index]],
            returnFromTestEntry;
        if (!isRemoveKey){
            var args = [this.element, code, _char];
            if (!rule || !(returnFromTestEntry = this.testEntry(this.element.get('value'), index, _char))){
                this.fireEvent('invalid', args);
                return false;
            }
            this.fireEvent('valid', args);
        }
        return (returnFromTestEntry != null) ? returnFromTestEntry : true;
    },

    shouldFocusNext: function(){
        return this.unmask(this.element.get('value')).length >= this.validIndexes.length;
    },

    createUnmaskRegex: function(){
        var fixedCharsArray = [].combine(this.options.mask.replace(Meio.Mask.rulesRegex, '').split(''));
        var chars = (fixedCharsArray.join('') + this.options.placeholder).escapeRegExp();
        this.unmaskRegex = chars ? new RegExp('[' + chars + ']', 'g') : null;
    },

    testEntry: function(str, index, _char){
        var maskArray = this.maskArray,
            rule = Meio.Mask.rules[maskArray[index]],
            ret = (rule && rule.regex.test(_char));
        return (rule.check && ret) ? rule.check(str, index, _char) : ret;
    },

    applyMask: function(str, newRangeStart){
        var strArray = str.split(''),
            maskArray = this.maskArray,
            maskMold = this.maskMold,
            rules = Meio.Mask.rules,
            eli = 0,
            returnFromTestEntry;

        while (eli < maskMold.length){
            if (!strArray[eli]){
                strArray[eli] = maskMold[eli];
            } else if (rules[maskArray[eli]]){
                if (!(returnFromTestEntry = this.testEntry(str, eli, strArray[eli]))){
                    strArray.splice(eli, 1);
                    continue;
                } else {
                    if (typeof returnFromTestEntry == 'string') strArray[eli] = returnFromTestEntry;
                }
                newRangeStart = eli;
            } else if (maskArray[eli] != strArray[eli]){
                strArray.splice(eli, 0, maskMold[eli]);
            } else {
                strArray[eli] = maskMold[eli];
            }
            eli++;
        }

        return {value: strArray.slice(0, this.maskMoldEmpty.length), rangeStart: newRangeStart + 1};
    },

    mask: function(str){
        str = this.applyMask(str).value.join('');
        if (this.options.removeInvalidTrailingChars) str = this.removeInvalidTrailingChars(str);
        return str;
    },

    unmask: function(str){
        return this.unmaskRegex ? str.replace(this.unmaskRegex, '') : str;
    }

});

Meio.Mask.createMasks('Fixed', {
    'Phone'        : {mask: '(99) 9999-9999'},
    'PhoneUs'    : {mask: '(999) 999-9999'},
    'Cpf'        : {mask: '999.999.999-99'},
    'Cnpj'        : {mask: '99.999.999/9999-99'},
    'Date'        : {mask: '3d/1m/9999'},
    'DateUs'    : {mask: '1m/3d/9999'},
    'Cep'        : {mask: '99999-999'},
    'Time'        : {mask: '2h:59'},
    'time'        : {mask: '2h:59'},
    'Cc'        : {mask: '9999 9999 9999 9999'},
    'Mac'        : {mask: 'HH:HH:HH:HH:HH:HH'},
    'datim'        : {mask: '3d.1m.9999 - 2h:59'},
    'date'        : {mask: '3d.1m.9999'}
});

/*
---

name: Meio.Mask.Reverse

description: A mask used for currency and decimal numbers.

authors:
 - Fábio Miranda Costa

requires:
 - Meio.Mask

license: MIT-style license

provides: [Meio.Mask.Reverse]

...
*/

Meio.Mask.Reverse = new Class({

    Extends: Meio.Mask,

    options: {
        autoSetSize: false,
        autoEmpty: false,
        alignText: true,
        symbol: '',
        precision: 2,
        decimal: ',',
        thousands: '.',
        maxLength: 18
    },

    initialize: function(options){
        this.parent(options);
        var thousandsChar = this.options.thousands,
            escapedThousandsChar = thousandsChar.escapeRegExp(),
            escapedDecimalChar = this.options.decimal.escapeRegExp();
        this.maxlength = this.options.maxLength;
        this.reThousands = new RegExp('^(-?[^\\D'+ escapedThousandsChar +']+)(\\d{3})');
        this.reRemoveLeadingZeros = /^0+(.*)$/;
        this.reDecimalNumber = /^[\d+\-]$/;
        this.thousandsReplaceStr = '$1' + thousandsChar + '$2';
        this.reThousandsReplace = new RegExp(escapedThousandsChar, 'g');
        this.reCleanup = new RegExp('[' + escapedThousandsChar + escapedDecimalChar + ']', 'g');
        this.reRemoveNonNumbers = new RegExp('[^\\d' + escapedThousandsChar + escapedDecimalChar + ']', 'g');
    },

    link: function(element){
        this.parent(element);
        if (this.options.alignText) this.element.setStyle('text-align', 'right');
        var elementValue = this.element.get('value');
        if (elementValue === '' && !this.options.autoEmpty){
            this.element.set('value', this.forceMask(elementValue, false));
        }
        return this;
    },

    focus: function(e, o){
        var element = this.element,
            elValue = element.get('value');
        if (this.options.autoEmpty){
            if (elValue === '') element.set('value', this.mask(elValue));
        } else {
            element.set('value', this.getValue(elValue, true));
        }
        this.parent(e, o);
    },

    blur: function(e, o){
        this.parent(e, o);
        var element = this.element,
            value = this.getValue(element.get('value'));
        if (this.options.autoEmpty && this.mask(value) == this.mask()) value = '';
        element.set('value', value);
    },

    keypress: function(e, o){
console.log(e,o,'keypress');
        if (this.ignore) return true;
        e.preventDefault();

        var state = this.getCurrentState(e, o), elementValue = state.value;

        if (!this.testEvents(elementValue, state._char, e.code, o.isRemoveKey)) return true;
        elementValue = this.forceMask(elementValue, true);

        var forcePositive = state._char === '+';
        var isNegative = this.isNegative(elementValue);
        elementValue = forcePositive ? isNegative ? elementValue.substring(1) : elementValue : elementValue;

        this.element.set('value', elementValue).setCaretPosition(elementValue.length);

        return this.parent();
    },

    testEvents: function(elementValue, _char, code, isRemoveKey){
        var args = [this.element, code, _char];
        if (!isRemoveKey){
            var elementValueLength = this.getValue(elementValue, false).length;
            if (!(this.reDecimalNumber).test(_char) || (this.maxlength && elementValueLength > this.maxlength)){
                this.fireEvent('invalid', args);
                return false;
            }
            this.fireEvent('valid', args);
        }
        return true;
    },

    paste: function(e, o){
        var element = this.element;
        var elValue = element.get('value');
        element.set('value', (elValue = this.forceMask(elValue, true))).setCaretPosition(elValue.length);
        return true;
    },

    forceMask: function(str, applySymbol){
        var negative = str.contains('-');
        str = this.cleanup(str);
        var precision = this.options.precision;
        var zeros = precision + 1 - str.length;
        if (zeros > 0) str = this.zeroize(str, zeros);
        if (precision){
            var decimalIndex = str.length - precision;
            str = str.substring(0, decimalIndex) + this.options.decimal + str.substring(decimalIndex);
        }
        var value = this.getValue(this.maskThousands(str), applySymbol);
        return this.negativize(value, negative);
    },

    cleanup: function(str){
        str = str.replace(this.reRemoveNonNumbers, '').replace(this.reCleanup, '');
        return this.getValue(str).replace(this.reRemoveLeadingZeros, '$1');
    },

    mask: function(str){
        str = this.unmask(str || '0').replace('.', this.options.decimal);
        return this.getValue(this.maskThousands(str), true);
    },

    unmask: function(str){
        return this.toNumber(this.getValue(str));
    },

    toNumber: function(str){
        var negative = this.isNegative(str);
        str = str.replace(this.reRemoveNonNumbers, '');
        if (!isFinite(str)){
            if (this.options.thousands) str = str.replace(this.reThousandsReplace, '');
            var decimalChar = this.options.decimal;
            if (decimalChar) str = str.replace(decimalChar, '.');
        }
        var number = str.toFloat().toFixed(this.options.precision);
        return this.negativize(number, negative);
    },

    getValue: function(str, applySymbol){
        var negative = this.isNegative(str);
        str = negative ? str.substring(1) : str;
        var symbol = this.options.symbol;
        var value = (str.substring(0, symbol.length) === symbol) ?
            applySymbol ? str : str.substring(symbol.length) :
            applySymbol ? symbol + str : str;
        return this.negativize(value, negative);
    },

    maskThousands: function(str){
        if (this.options.thousands){
            while (this.reThousands.test(str)) str = str.replace(this.reThousands, this.thousandsReplaceStr);
        }
        return str;
    },

    zeroize: function(str, zeros){
        while (zeros--) str = '0' + str;
        return str;
    },

    isNegative : function(str) {
        return str.indexOf('-') === 0;
    },

    negativize : function(str, negative) {
        return negative ? '-' + str : str;
    },

    shouldFocusNext: function(){
        return this.getValue(this.element.get('value'), false).length >= this.options.maxLength;
    }
});

Meio.Mask.createMasks('Reverse', {
    'Integer'       : {precision: 0, maxLength: 18},
    'IntegerUs'     : {precision: 0, maxLength: 18, thousands: ',', decimal: '.'},
    'Decimal'       : { },
    'DecimalUs'     : {thousands: ',', decimal: '.'},
    'Reais'         : {symbol: 'R$ '},
    'Euro'          : {symbol: '€ '},
    'Dollar'        : {symbol: 'US$ ', thousands: ',', decimal: '.'}
});

/*
---

name: Meio.Mask.Repeat

description: A mask that is defined by a pattern that will match each of the inputted chars.

authors:
 - Fábio Miranda Costa

requires:
 - Meio.Mask

license: MIT-style license

provides: [Meio.Mask.Repeat]

...
*/

Meio.Mask.Repeat = new Class({

    Extends : Meio.Mask,

    options: {
        mask: '',
        maxLength: 0 // 0 for infinite
    },

    keypress: function(e, o){
        if (this.ignore) return true;
        e.preventDefault();

        var state = this.getCurrentState(e, o);
        var ruleRegex = Meio.Mask.rules[this.options.mask.charAt(0)].regex;
        var args = [this.element, state._char, e.code];
        var maxLength = this.options.maxLength;

        if ((maxLength && state.value.length > maxLength) || (!ruleRegex.test(state._char) && !o.isRemoveKey)){
            this.fireEvent('invalid', args);
        } else {
            this.fireEvent('valid', args);
            this.element.set('value', state.value).setCaretPosition(state.start + (o.isRemoveKey ? 0 : 1));
        }

        return this.parent();
    },

    paste: function(e, o){
        var maskedValue = this.mask(this.element.get('value'));
        this.element.set('value', maskedValue).setCaretPosition(maskedValue.length);
    },

    mask: function(str){
        var strArray = str.split(''),
            ruleRegex = Meio.Mask.rules[this.options.mask.charAt(0)].regex;
        for (var i = 0; i < strArray.length; i++){
            if (!ruleRegex.test(strArray[i])){
                strArray.splice(i, 1);
                i--;
            }
        }
        var maxLength = this.options.maxLength;
        return strArray.join('').substring(0, maxLength ? maxLength : strArray.length);
    }

});


/*
---

name: Meio.Mask.Regexp

description: A mask that is defined by a regular expression.

authors:
 - Fábio Miranda Costa

requires:
 - Meio.Mask

license: MIT-style license

provides: [Meio.Mask.Regexp]

...
*/

Meio.Mask.Regexp = new Class({

    Extends : Meio.Mask,

    options: {
        regex: null
    },

    initialize : function(element, options){
        this.parent(element, options);
        this.regex = new RegExp(this.options.regex);
    },

    keypress: function(e, o){
        if (this.ignore) return true;
        e.preventDefault();

        var state = this.getCurrentState(e, o);
        var args = [this.element, state._char, e.code];

        if (!this.regex.test(state.value)){
            this.fireEvent('invalid', args);
        } else {
            this.element.set('value', state.value).setCaretPosition(state.start + (o.isRemoveKey ? 0 : 1));
            this.fireEvent('valid', args);
        }

        return true;
    },

    paste: function(e, o){
        var masked = this.applyMask(this.element.get('value'), true);
        this.element.set('value', masked.value).setCaretPosition(masked.index);
    },

    applyMask: function(str, fireEvent){
        var oldValue = '', curValue;
        for (var i = 1; i <= str.length; i++){
            curValue = str.substring(0, i);
            if (!this.regex.test(curValue)){
                if (fireEvent) this.fireEvent('invalid', [this.element, str.charAt(i), str.charCodeAt(i)]);
                break;
            }
            oldValue = curValue;
        }
        return {value: oldValue, index: i};
    },

    mask: function(str){
        return this.applyMask(str).value;
    }

});

Meio.Mask.createMasks('Regexp', {
    'Ip'        : {regex: /^(?:\d{0,3}\.){0,3}(?:\d{0,3})?$/},
    'Ipv6'      : {regex: /^(?:[\da-fA-F]{0,4}\:){0,7}([\da-fA-F]{0,4})?$/},
    'Email'     : {regex: /^[\w.!#$%&'*+=?~\^_`{|}\/\-]*@?[.\w\-]*$/}
});


/*
---

name: Meio.Mask.Extras

description: Extra functionality for Meio.Mask plugin. Like String.meiomask that masks a string and Element.meiomask which is a convinience method for setting the masks.

authors:
 - Fábio Miranda Costa

requires:
 - Meio.Mask

license: MIT-style license

provides: [Meio.Mask.Extras]

...
*/

(function(){

    var meiomask = 'meiomask';

    var upperCamelize = function(str){
        return str.camelCase().capitalize();
    };

    var getClassOptions = function(a1, a2, opts){
        var klass;
        if (typeOf(a1) == 'string'){
            if (typeOf(a2) != 'string'){
                opts = a2;
                a1 = a1.split('.');
                a2 = a1[1];
                a1 = a1[0];
            }
            klass = Meio.Mask[upperCamelize(a1)];
            if (a2) klass = klass[upperCamelize(a2)];
        } else {
            klass = a1;
            opts = a2;
        }
        return {klass: klass, options: opts || {}};
    };

    var executeFunction = function(functionName, args){
        var co = getClassOptions.apply(null, args);
        return new co.klass(co.options)[functionName](this);
    };

    String.implement({
        meiomask: function(){
            return executeFunction.call(this, 'mask', arguments);
        },
        meiounmask: function(){
            return executeFunction.call(this, 'unmask', arguments);
        }
    });

    Element.Properties.meiomask = {
        set: function(args){
            args = getClassOptions.apply(null, args);
            var mask = this.retrieve(meiomask);
            if (mask){
                mask.unlink();
                mask = null;
            }
            return this.store(meiomask, new args.klass(args.options).link(this));
        },
        // returns the mask object
        get: function(){
            return this.retrieve(meiomask);
        },
        // removes completely the mask from this input
        erase: function(){
            var mask = this.retrieve(meiomask);
            if (mask) mask.unlink();
            return this;
        }
    };

    Element.Properties[meiomask + ':value'] = {
        // sets the value but first it applyes the mask (if theres any)
        set: function(value){
            var mask = this.retrieve(meiomask);
            if (mask) value = mask.mask(value);
            return this.set('value', value);
        },

        // gets the unmasked value
        get: function(){
            var mask = this.retrieve(meiomask);
            var value = this.get('value');
            return (mask) ? mask.unmask(value) : value;
        }
    };

    Element.implement({
        meiomask: function(mask, type, options){
            return this.set(meiomask, [mask, type, options]);
        }
    });

})();

