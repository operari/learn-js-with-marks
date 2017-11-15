/**
 *
 * ContentScript
 *
 */

;(function() {
	var init = function(window, document, selectors, button, search, callback, click_delay) {
		var parents = null;
		function getParents() {
			parents = document.querySelectorAll(selectors);
		}
		function clickInit() {
			document.addEventListener('click', function(e) {
				var target = e.target;
				if (/^map/.test(target.className)) {
					setTimeout(function() {
						getParents();
						callback(module);
					}, click_delay);
				}
			});
		}

		var module = {
			addControls: function(marks, o, t) {
				var that = this;
				var progress = o.progress[0] ? true : false;

				[].forEach.call(parents, function(parent, indx, array) {
					var wrap =  document.createElement('div');
					var select = document.createElement('select'), option = null, id = 'parent_'+indx;
					var label  = document.createElement('label');
					wrap.className = 'mdl-selectfield mdl-selectfield--mini mdl-js-selectfield mdl-selectfield--floating-label';
					var tooltip = document.createElement('div');
					tooltip.className = 'mdl-tooltip';
					tooltip.setAttribute('data-mdl-for', 's_' + indx);
					select.id = 's_' + indx;
					select.className = 'mdl-selectfield__select';
					label.className = 'mdl-selectfield__label';
					label.for = 's_' + indx;

					marks.forEach(function(v, i) {
						option = document.createElement('option');
						option.value = i;
						option.innerHTML = v;
						select.appendChild(option);
					});

					setTimeout(function() { componentHandler.upgradeElement(tooltip); }, 0);
					wrap.appendChild(select);
					wrap.appendChild(label);
					wrap.appendChild(tooltip);
					componentHandler.upgradeElement(wrap);
					var fe = parent.firstElementChild;
					fe.insertAdjacentElement('beforebegin', wrap);
					parent.style.display = 'flex';
					parent.style.alignItems = 'baseline';
					parent.style.flexWrap = 'wrap';
					parent.children[1].style.width = 'calc(100% - 77px)';
					parent.querySelector('ul').style.width = '100%';
					parent.querySelector('ul').style.padding = '7px 0';
					wrap.style.marginRight = '10px';
					parent.id = id;
					chrome.storage.sync.get(id, function(items) {
						var get_id = items[id];
						that.selectMark(select, get_id, o, progress, parent, t[indx]);

						if (!get_id) {
							tooltip.textContent = o.desc[0];
						} else if (get_id > select.options.length-1) {
							that.setSectIndexValue(id, 0);
							tooltip.textContent = o.desc[0];
						} else {
							tooltip.textContent = o.desc[get_id];
						}

						if (array.length-1 == indx) {
							chrome.storage.local.set({'learnjavascriptoptions': JSON.stringify(o)});
						}

					});
				});
			},

			initProgressHash: function(o, link, t) {
				var obj = {
					'url': link.href ? link.href.replace(/.+\.ru\//, '') : '',
					'learned': false,
					'scrolled': 0,
					'must_scroll': 0,
					'time_spent': 0,
					'time_must_spend': t || 0
				};
				o.progress.push(obj);
			},

			selectMark: function(select, id, o, p, l, t) {
				var link = l.querySelector('.tutorial-map-list-three__link');
				if (!p)
					this.initProgressHash(o, link, t);
				if (id && id != '0') {
					if (select.options[id]) {
						// console.log(o.desc[id]);
						select.options.selectedIndex = id;
						select.setAttribute('style', o.pallete[id]);
					} else {
						select.options.selectedIndex = 0;
					}
				}
			},

			selectChange: function(o) {
				var that = this;
				document.addEventListener('change', function(e) {
					var target = e.target;
					if (target.tagName == 'SELECT') {
						that.setSectIndexValue(target.parentNode.parentNode.id, target.value);
						target.setAttribute('style', o.pallete[target.value]);
						target.parentNode.querySelector('.mdl-tooltip').textContent = o.desc[target.value];
					}
				});
			},
			setSectIndexValue: function(id, val) {
				var items = {};
				items[id] = val;
				chrome.storage.sync.set(items);
			},
			addProgress: function(target) {
				var that = this;
				target = document.querySelectorAll(target)[0];
				var p1 = document.createElement('div');
				p1.id = 'p1';
				p1.className = 'mdl-progress mdl-js-progress';
				componentHandler.upgradeElement(p1);
				target.insertAdjacentElement('afterend', p1);
				setTimeout(function() {
					that.setProgress(p1, 50);
				}, 800);
			},
			setProgress: function(el, n) {
				// console.log(el.firstElementChild.style.width);
				// console.log(n);
				el.firstElementChild.style.width = n + '%';
			}
		};

		if (window.location.search == search) {
			getParents();
			callback(module);
		}

		clickInit();

	};

	function checkAndClearSyncStorage(callback) {
		var obj = {};
		chrome.storage.sync.get('learnjavascriptmarks', function(items) {
			var marks = items.learnjavascriptmarks;
			chrome.storage.sync.get('learnjavascriptoptions', function(items1) {
				var options = items1.learnjavascriptoptions;
				if (marks && options) {
					obj.marks = JSON.parse(marks);
					options = JSON.parse(options);
					for (var prop in options)
						obj[prop] = options[prop];
					callback(obj);
				}
				else {
					callback(false);
				}
			});
		});
	}

	checkAndClearSyncStorage(function(obj) {
		console.log(obj);
	});

	var marks = ['S','?', '!', '&#10003;', '&#9733;'];
	var options = {
		'pallete': ['color: #000; background-color: #fff','color: #fff; background-color: #2196F3', 'color: #fff; background-color: #f44336', 'color: #fff; background-color: #4caf50', 'color: #ffffff; background-color: #ffc107'],
		'desc': ['Выбрать', 'Не все ясно', 'Важно', 'Усвоено', 'Прочитано'],
		'progress': []
	};
	var click_delay = 1000;
	var time_must_spend = [300000];

	chrome.storage.sync.get('learnjavascriptmarks', function(items) {

		if (!items.learnjavascriptmarks) {
			chrome.storage.sync.set({'learnjavascriptmarks': JSON.stringify(marks)});
		} else {
			marks = JSON.parse(items.learnjavascriptmarks);
		}
		// console.log(marks);
		chrome.storage.sync.get('learnjavascriptoptions', function(items) {
			if (!items.learnjavascriptoptions) {
				chrome.storage.sync.set({'learnjavascriptoptions': JSON.stringify(options)});
			} else {
				var o = JSON.parse(items.learnjavascriptoptions);
				options = JSON.parse(items.learnjavascriptoptions);
				chrome.storage.sync.set({'learnjavascriptoptions': JSON.stringify(options)});
				if (!o.progress) {
					o.progress = options.progress;
					options = o;
				} else {
					options = JSON.parse(items.learnjavascriptoptions);
				}
			}
			// console.log(options);
			setTimeout(function() {
				init(window, document, '.tutorial-map-list-three__item', 'map__text', '?map', function(mod) {
					mod.addControls(marks, options, time_must_spend);
					mod.selectChange(options);
					mod.addProgress('.tutorial-map-list__title');
				}, click_delay);
			}, click_delay);

		});

	});

})();