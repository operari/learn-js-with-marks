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
						callback(module, parents);
					}, click_delay);
				}
			});
		}

		var module = {
			items: {},
			indx: {},
			time: 0,
			count_learned: 0,

			getAndSetTime: function(set) {
				var d = new Date();
				d = Date.parse(d);

				if (set)
					this.time = d;

				return d;
			},

			getAssocObjectOnPage: function(callback) {
				var url = window.location.pathname.replace(/^\/{1,}/, '');
				this.getAndSetTime(true);
				// console.log(this.time);
				chrome.storage.local.get('learnjavascriptmarks', function(items) {
					items = JSON.parse(items.learnjavascriptmarks);
					var indx = -1;
					items.progress.some(function(o, i) {
						if (o.url && o.url == url) {
							indx = i;
							return true;
						}
					});
					callback(items, indx);
				});
			},

			setAssocObjectMustScroll: function(items, indx) {
				var article = document.querySelector('.content article');
				var o = items.progress[indx];
				o.must_scroll[0] = article ? (article.offsetTop + article.offsetHeight - window.innerHeight) : 0;
				o.must_scroll[1] = window.innerWidth;
				this.items = items;
				this.indx = indx;
				// console.log(o);
			},

			setObjectScrolled: function(scrolled) {
				var val = this.items.progress[this.indx].scrolled;
				this.items.progress[this.indx].scrolled = scrolled > val ? scrolled : val;
				// console.log(scrolled);
				// console.log(this.items.progress[this.indx]);
			},

			saveAssocObject: function() {
				console.log(this.items.progress[this.indx]);
				chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(this.items)});
			},

			setTimeSpent: function() {
				var time_start = this.time;
				var time_end = this.getAndSetTime();
				this.items.progress[this.indx].time_spent += time_end - time_start;
				// console.log(this.items.progress[this.indx]);
			},

			setIsLearn: function() {

				if (this.items.progress[this.indx].scrolled >= this.items.progress[this.indx].must_scroll[0] &&
						this.items.progress[this.indx].time_spent >= this.items.progress[this.indx].time_must_spend)
					this.items.progress[this.indx].learned = true;
				else
					this.items.progress[this.indx].learned = false;

			},

			pageListeners: function(items, indx) {

				var handlerResize = function() {
					this.setAssocObjectMustScroll(this.items, this.indx);
					// console.log(this.items.progress[this.indx]);
				};

				var handlerScroll = function() {
					this.setObjectScrolled(window.pageYOffset);
				};

				var handlerClick = function(e) {
					var target = e.target;

					if (/^map/.test(target.className)) {
						this.setTimeSpent();
						this.setIsLearn();
						this.saveAssocObject();
						// console.log(this.items.progress[this.indx]);
					}

				};

				window.addEventListener('resize', handlerResize.bind(this));
				window.addEventListener('scroll', handlerScroll.bind(this));
				document.addEventListener('click', handlerClick.bind(this));
			},

			addControls: function(t) {
				var that = this;
				var progress = this.items.progress[0] ? true : false;

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

					that.items.marks.forEach(function(v, i) {
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
					var get_id = that.items.mark_id[indx];

					that.selectMark(select, get_id, progress, parent, t[indx], indx);
					if (!indx)
						console.log(that.items.progress[indx]);

					if (!get_id) {
						tooltip.textContent = that.items.desc[0];
					} else if (get_id > select.options.length-1) {
						that.items.mark_id[indx] = 0;
						tooltip.textContent = that.items.desc[0];
					} else {
						tooltip.textContent = that.items.desc[get_id];
					}

				});
				chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(this.items)});
			},

			initProgressHash: function(link, t) {
				var obj = {
					'url': link.href ? link.href.replace(/.+\.ru\//, '') : '',
					'learned': false,
					'scrolled': 0,
					'must_scroll': [],
					'time_spent': 0,
					'time_must_spend': t || 0
				};
				this.items.progress.push(obj);
			},

			selectMark: function(select, id, p, l, t, i) {
				var link = l.querySelector('.tutorial-map-list-three__link');
				if (!p)
					this.initProgressHash(link, t);
				// console.log(this.items.progress[id]);
				var learned = this.items.progress[i].learned;
				var words = ['усвоено', 'изучено', 'выполнено'];
				var add_word = ['важно'];
				var complete = -1;

				if (id && (+id) !== 0) {
					if (select.options[id]) {
						select.options.selectedIndex = id;
						select.setAttribute('style', this.items.pallete[id]);

						if (learned) {
							complete = this.items.desc.filter(function(v, i) {
								if (~words.concat(add_word).indexOf(v.toLowerCase()))
									return i;
							})[i];

							if (~complete)
								this.count_learned++;
						}

					} else {
						select.options.selectedIndex = 0;
					}

				} else {

					if (learned) {
						complete = this.items.desc.filter(function(v, i) {
							if (~words.indexOf(v.toLowerCase()))
								return i;
						})[i];

						select.options.selectedIndex = complete;
						this.count_learned++;
					}

				}


			},

			selectChange: function(marks) {
				var that = this;
				document.addEventListener('change', function(e) {
					var target = e.target;
					if (target.tagName == 'SELECT') {
						var mark_id = target.parentNode.parentNode.id.replace(/\D+/g, '');
						var mark_val = target.value;
						this.items.mark_id[mark_id] = mark_val;
						chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(marks)});
						target.setAttribute('style', this.items.pallete[target.value]);
						target.parentNode.querySelector('.mdl-tooltip').textContent = this.items.desc[target.value];
					}
				});
			},

			addProgress: function(target) {
				var that = this;
				target = document.querySelectorAll(target)[0];
				if (!target) return;
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

		// if (window.location.search == search) {
			getParents();
			callback(module, parents);
		// }

		clickInit();

	};

	function checkAndClearSyncStorage(callback) {
		var obj = {};
		chrome.storage.sync.get(null, function(items) {
			// console.log(items);
			var marks = items.learnjavascriptmarks;
			var options = items.learnjavascriptoptions;
				if (marks && options) {
					obj.marks = JSON.parse(marks);
					obj.mark_id = obj.mark_id ? obj.mark_id : [];
					obj.progress = obj.progress ? obj.progress : [];
					options = JSON.parse(options);
					for (var prop in options)
						obj[prop] = options[prop];
					delete items.learnjavascriptmarks;
					delete items.learnjavascriptoptions;
					for (var prop1 in items) {
						items[prop1.replace(/\D+/g,'')] = items[prop1];
						delete items[prop1];
					}
					for (var prop2 in items)
							obj.mark_id.push(items[prop2]);
					callback(false);
				}
				else {
					callback(false);
				}
		});
	}

	// chrome.storage.local.clear();

	checkAndClearSyncStorage(function(obj) {
		var marks = obj || {
			'marks': ['S','?', '!', '&#10003;', '&#9733;'],
			'pallete': ['color: #000; background-color: #fff','color: #fff; background-color: #2196F3', 'color: #fff; background-color: #f44336', 'color: #fff; background-color: #4caf50', 'color: #ffffff; background-color: #ffc107'],
			'desc': ['Выбрать', 'Не все ясно', 'Важно', 'Усвоено', 'Прочитано'],
			'mark_id': [],
			'progress': []
		};
		var click_delay = 1000;
		var time_must_spend = [300000];

		chrome.storage.local.get('learnjavascriptmarks', function(items) {

			if (!items.learnjavascriptmarks)
				chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(marks)});
			else
				marks = JSON.parse(items.learnjavascriptmarks);
			// console.log(marks);
			setTimeout(function() {
				init(window, document, '.tutorial-map-list-three__item', 'map__text', '?map', function(mod, parents) {
					if (!parents.length && window.location.pathname != '/') {
						mod.getAssocObjectOnPage(function(items, indx) {
							mod.setAssocObjectMustScroll(items, indx);
							setTimeout(function() {
								mod.pageListeners();
							}, 1000);
						});
						return;
					}
					mod.items = marks;
					mod.addControls(time_must_spend);
					mod.selectChange();
					mod.addProgress('.tutorial-map-list__title');
				}, click_delay);
			}, click_delay);

		});

	});


})();