/**
 * Dependency of CSS editing plugins like CSS Snippets or CSS Controls
 * @author Lea Verou
 * MIT License
 */
 
(function(){

var dummy = document.createElement('div');
 
var self = window.CSSEdit = {
	isCSSValid: function(code) {
		var declarationCount = (code.match(/(?!data:|https?:|blob:)\b[a-z-]+:/gi) || []).length;
			
		dummy.removeAttribute('style');
		dummy.setAttribute('style', code);
		
		return declarationCount > 0 && dummy.style.length >= declarationCount;
	},
	
	setupSubjects: function(subjects) {
		for (var i=0; i<subjects.length; i++) {
			var subject = subjects[i];
			
			subject.setAttribute('data-originalstyle', subject.getAttribute('style') || '');
			subject.setAttribute('data-originalcssText', subject.style.cssText || '');
		}
	},
	
	getSubjects: function(element) {
		var selector = element.getAttribute('data-subject'),
			subjects,
			scoped = element.hasAttribute('data-scoped');
		var slide = window.SlideShow? SlideShow.getSlide(element.parentNode) : document.body;
		
		if (scoped && slide.id) {
			var slideId = slide.id;
			selector = '#' + slideId + ' ' + selector;
		}
		
		if (selector) {
			subjects = self.util.toArray(slide.querySelectorAll(selector)) || [];
		}
		else {
			subjects = element.hasAttribute('data-subject')? [element] : [];
		}
		
		
		// If no subject specified, it will be the slide
		if(!subjects.length) {
			// Find containing slide
			subjects = [slide? slide : element];
		}
		

		subjects.forEach(function(subject){
			subject.classList.add("subject");
		});
		
		return subjects;
	},
	
	updateStyle: function(subjects, code, originalAttribute) {
		code = code? StyleFix.fix(code.trim()) : '';
		
		if(!code || self.isCSSValid(code)) {
			dummy.setAttribute('style', code);
			
			var appliedCode = dummy.style.cssText,
			    properties = appliedCode.match(/\b[a-z-]+(?=:)/gi),
			    propRegex = [];
			
			if(code) {
				for(var i=0; i<properties.length; i++) {
					properties[i] = self.util.camelCase(properties[i]);
				}
			}
			
			for (var i=0; i<subjects.length; i++) {
				var element = subjects[i],
					prevStyle = element.getAttribute('style');
				
				if(prevStyle && prevStyle !== 'null') {
					if(code) {
						for(var j=0; j<properties.length; j++) {
							element.style[properties[i]] = null;
						}
					}
					
					element.setAttribute('style', (element.getAttribute(originalAttribute) || '') + '; ' + code);
				}
				else {
					element.setAttribute('style', code);
				}
			}
			
			return true;
		}
		else {
			return false;
		}
	},
	
	elastic: function(textarea) {
		if(!/^textarea$/i.test(textarea.nodeName) 
			|| !('rows' in textarea)
			|| textarea.classList.contains('dont-resize')) {
			return;
		}
		
		self.util.adjustHeight(textarea);
		
		textarea.addEventListener('keyup', function(evt) {
			if(evt.keyCode == 13) {
				self.util.adjustHeight(this);
			}
		}, false);
		
		textarea.addEventListener('input', function(evt) {
			self.util.adjustHeight(this);
		}, false);
	},
	
	util: {
		camelCase: function(str) {
			return str.replace(/-(.)/g, function($0, $1) { return $1.toUpperCase() })
		},
		
		toArray: function(collection) {
			return Array.prototype.slice.apply(collection);
		},
		
		adjustHeight: function(textarea) {
			textarea.rows = textarea.value.split(/\r\n?|\n/).length;
			
			if (!textarea.classList.contains('dont-font-resize')) {
				textarea.style.fontSize = Math.min(100, Math.max(100 - textarea.rows * 5, 65)) + '%';
			}
		}
	}
 };
  
 })()
