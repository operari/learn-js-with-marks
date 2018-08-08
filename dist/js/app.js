/**
 *
 * ContentScript
 *
 */

;(function() {
	/**
	 * Инициализация программы.
	 * @param  {object}   window          - объект окна
	 * @param  {object}   document        - объект документа
	 * @param  {string}   selectors       - селектор родительского списка (li)
	 * @param  {string}   progress_prev   - селектор заголовка карты учебника
	 * @param  {array}    button          - массив селекторов о определяющих кнопку карты учебника
	 * @param  {string}   content_article - селектор статьи
	 * @param  {Function} callback        - возвращает управление в точку вызова; передает модуль, псевдомассив элементов списка, элемент статьи; при клике на кнопку "карта учебника" передает модуль и псевдомассив элементов списка.
	 * @param  {[type]}   click_delay     - задежка перед вызовом основного функционала
	 */
	var init = function(window, document, selectors, progress_prev, button, content_article, callback, click_delay) {

		var parents = null; // массив элементов - родительские списки (li)
		var article = null; // обертка основного текста статьи

		/**
		 * Приватная функция получает элементы и присвает их приватным переменным.
		 */
		function getElements() {
			parents = document.querySelectorAll(selectors);
			article = document.querySelector(content_article);
		}

		/**
		 * Регистрирует на документе событие клика. Отлавливает кнопку при клике на которую возвращает управление с модулем.
		 */
		function clickInit() {
			document.addEventListener('click', function(e) {
				if (e.target.classList.contains(button[0]) ||
						e.target.classList.contains(button[1])) {
					setTimeout(function() {
						getElements();
						callback(module, parents);
					}, click_delay);
				}
			});
		}

		/**
		 * [module description]
		 * @type {Object}
		 */
		var module = {
			items: {}, // объект с метками и доп. данными
			indx: {},
			time: 0, // время unix
			count_learned: 0,

			/**
			 * Обновляет время unix и todo
			 * @param  {boolean} reset - Флаг для записи времени в объект.
			 */
			resetData: function(reset) {
				if (reset) {
					this.time = this.getAndSetTime(true);
					this.count_learned = 0;
				}
			},

			/**
			 * Проверяет наличие записи в локальном хранилище "chrome". При отсутствии объекта записывает в хранилище сериализованный объект меток; объект с метками присваивает св-ву модуля items. При наличии объекта в хранилище, обновляет объект в переменной marks (переданный в функцию) и присваивает св-ву модуля items.
			 * @param  {array}   marks     - Объект с метками и другими данными.
			 * @param  {Function} callback - Возвращает управление.
			 */
			getAndSetMarks: function(marks, callback) {
				var that = this;
				// console.log(marks);

				chrome.storage.local.get('learnjavascriptmarks', function(items) {

					if (!items.learnjavascriptmarks)
						chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(marks)});
					else
						marks = JSON.parse(items.learnjavascriptmarks);
					console.log(marks);
					that.items = marks;
					callback();
				});

			},

			/**
			 * Пишет в св-во объекта кол-во миллисекунд прошедших по времени unix и возвращет число миллисекунд.
			 * @param  {boolean} set - Флаг для записи времени в свойство объекта.
			 * @return {number} Миллисекунды.
			 */
			getAndSetTime: function(set) {
				var d = new Date();
				d = Date.parse(d);

				if (set)
					this.time = d;

				return d;
			},

			/**
			 * Получает индекс объекта соответствующий урлу страницы.
			 * @param  {Function} callback - Возвращает управление в точку вызова передавая объект с метками и индекс объекта в массиве progress.
			 */
			getAssocObjectOnPage: function(callback) {
				var url = window.location.pathname.replace(/^\/{1,}/, '');
				this.getAndSetTime(true);
				// console.log(this.time);
				chrome.storage.local.get('learnjavascriptmarks', function(items) {
					items = JSON.parse(items.learnjavascriptmarks);
					var indx = -1;
					// пишет индекс объекта для возвращения
					items.progress.some(function(o, i) {
						if (o.url && o.url == url) {
							indx = i;
							return true;
						}
					});
					callback(items, indx);
				});
			},

			/**
			 * Пишет в св-во must_scroll ассоциативного объекта из массива progress величину необходимую прокрутить и ширину экрана. Обновляет объект с метками и пишет индекс ассоциативного объекта.
			 * @param {object} items - Объект с метками и доп. информацией.
			 * @param {number} indx  - Индекс объекта из массива progress соответствующий странице.
			 */
			setAssocObjectMustScroll: function(items, indx) {
				var o = items.progress[indx];
				o.must_scroll[0] = article ? (article.offsetTop + article.offsetHeight - window.innerHeight) : 0;
				o.must_scroll[1] = window.innerWidth;
				this.items = items;
				this.indx = indx;
				console.log(o);
			},

			/**
			 * Устанавливает в ассоциативный странице объект прокрутку, если значение больше текущего.
			 * @param {number} scrolled - Прокрутка от начала страницы.
			 */
			setObjectScrolled: function(scrolled) {
				var val = this.items.progress[this.indx].scrolled;
				this.items.progress[this.indx].scrolled = scrolled > val ? scrolled : val;
				// console.log(scrolled);
				// console.log(this.items.progress[this.indx]);
			},

			/**
			 * Сохраняет в хранилище объект меток.
			 */
			saveAssocObject: function() {
				// console.log(this.items.progress[this.indx]);
				chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(this.items)});
			},

			/**
			 * Устанавливает в ассоциативный странице объект время затраченное на чтение.
			 */
			setTimeSpent: function() {
				var time_start = this.time;
				// console.log('Время загрузки страницы: ' + time_start);
				var time_end = this.getAndSetTime();
				// console.log('Время клика на кнопку карты: ' + time_end);
				this.items.progress[this.indx].time_spent += time_end - time_start;
				// console.log('Затрачено времени на прочтение: ' + this.items.progress[this.indx].time_spent);
				// console.log(this.items.progress[this.indx]);
			},

			/**
			 * Устанавливает изучен материал или нет.
			 */
			setIsLearn: function() {

				// прокрутка больше, равна необходимой прокрутки и затраченное время больше равно необходимого времени
				if (this.items.progress[this.indx].scrolled >= this.items.progress[this.indx].must_scroll[0] &&
						this.items.progress[this.indx].time_spent >= this.items.progress[this.indx].time_must_spend)
					this.items.progress[this.indx].learned = true;

			},

			/**
			 * Регистрирует обработчики событий на объект документа, на карте учебника.
			 */
			mapListeners: function() {

				var handlerClick = function(e) {
					var target = e.target;
					if (/\bclose-button\b/.test(target.className)) {
						this.resetData(true);
					}
				};

				var handlerKeyUp = function(e) {
					var key = e.keyCode;

					// esc
					if (key == 27) {
						this.resetData(true);
					}

				};

				document.addEventListener('click', handlerClick.bind(this));
				document.addEventListener('keyup', handlerKeyUp.bind(this));

			},

			/**
			 * Регистрирует обработчики событий на объект окна и документа, на странице со статьей.
			 */
			pageListeners: function() {

				var handlerResize = function() {
					this.setAssocObjectMustScroll(this.items, this.indx);
					// console.log(this.items.progress[this.indx]);
				};

				var handlerScroll = function() {
					this.setObjectScrolled(window.pageYOffset);
					// console.log('scroll');
				};

				var handlerClick = function(e) {
					var target = e.target;

					// клик на кнопку карты
					if (/^map/.test(target.className)) {
						this.setTimeSpent();
						this.setIsLearn();
						this.saveAssocObject();
					}
				};

				var handlerUnload = function(e) {
					this.setTimeSpent();
					this.setIsLearn();
					this.saveAssocObject();
				};

				window.addEventListener('resize', handlerResize.bind(this));
				window.addEventListener('scroll', handlerScroll.bind(this));
				document.addEventListener('click', handlerClick.bind(this));
				window.addEventListener('beforeunload', handlerUnload.bind(this));

			},

			/**
			 * Создает раскрывающиеся списки и добавляет их в карту для перед заголовком каждого урока. Сохраняет в хранилище объект с метками.
			 * @param {array} t - Массив с временем для каждоый статьи.
			 */
			addControls: function(t) {
				var that = this;
				var progress = this.items.progress[0] ? true : false;

				[].forEach.call(parents, function(parent, indx, array) {
					var get_id = that.items.mark_id[indx];
					var wrap =  document.createElement('div');
					var select = document.createElement('select'), option = null, id = 'parent_'+indx;
					var label  = document.createElement('label');
					wrap.className = 'mdl-selectfield mdl-selectfield--mini mdl-js-selectfield mdl-selectfield--floating-label';
					var tooltip = that.addTooltip('s_' + indx);
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

					that.selectMark(select, get_id, progress, parent, t[indx], indx);
					that.setSelectTooltipText(select, get_id, tooltip);
					// if (!indx)
					// 	console.log(that.items.progress[indx]);

				});
				console.log('Кол-во изученных уроков: ' + this.count_learned);
				this.addProgress(progress_prev);
				chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(this.items)});
			},

			/**
			 * Создает объект с со значением членов по-умолчанию и добавляет в массив progress.
			 * @param  {object} link - Элемент ссылки.
			 * @param  {number} t    - Отрезок времени для изучения материала.
			 */
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

			/**
			 * Находит первое соответствие из массива words слову усвоено или его синониму в массиве desc. Если передан идентификатор метки, то вырезает из массива desc элемент по идентификатору и изменяет исходный массив.
			 * @param  {number} n - Идентификатор выбранной метки.
			 * @return {number} Индекс метки усвоено или его синонима.
			 */
			getIndexMarkComplete: function(n) {
				var desc = this.items.desc.map(function(v,i) { return v.toLowerCase(); });
				var words = ['усвоено', 'изучено', 'выполнено'];
				var add_word = ['важно'];
				var complete = -1;

				if (isFinite(n))
					desc = desc.splice(n, 1);

				words.concat(n ? add_word : []).some(function(v, i) {
					complete = desc.indexOf(v);
					if (~complete)
						return true;
				});

				return complete;
			},

			/**
			 * Выбирает метку. Подсчитывает кол-во изученных уроков.
			 * @param  {object} select - Выпадающий список.
			 * @param  {number} id     - Идентификатор метки.
			 * @param  {boolean} p     - Наличие или отсутствие элементов в массиве progress.
			 * @param  {object} l      - Элемент родительского списка.
			 * @param  {number} t      - Отрезок времени для изучения материала.
			 * @param  {number} i      - Индекс родительско элемента списка.
			 */
			selectMark: function(select, id, p, l, t, i) {
				var link = l.querySelector('.tutorial-map-list-three__link');
				if (!p) {
					this.initProgressHash(link, t);
				} else {
					var t_spend = this.items.progress[i].time_must_spend;
					if (!t_spend) {
						this.items.progress[i].time_must_spend = t;
					}
				}
				var learned = this.items.progress[i].learned;

				// проверяет или индекс отметки больше нуля
				if (id && (+id) !== 0) {

					// проверяет если в селекте существует опция с переданным id
					if (select.options[id]) {
						select.options.selectedIndex = id;
						select.setAttribute('style', this.items.pallete[id]);

						// проверяет или материал изучен
						if (learned) {
							if (~this.getIndexMarkComplete(id))
								this.count_learned++;
						}

					} else {
						select.options.selectedIndex = 0;
					}

				// проверяет или индекс отметки нулевой
				} else {

					// проверяет или материал изучен
					if (learned) {
						select.options.selectedIndex = this.getIndexMarkComplete();
						select.setAttribute('style', this.items.pallete[select.options.selectedIndex]);
						this.count_learned++;
					}

				}

			},

			addTooltip: function(attr) {
				var tooltip = document.createElement('div');
				tooltip.className = 'mdl-tooltip';
				tooltip.setAttribute('data-mdl-for', attr);
				setTimeout(function() { componentHandler.upgradeElement(tooltip); }, 0);

				return tooltip;
			},

			/**
			 * Пишет текст в тултип.
			 * @param  {object} select  - Выпадающий список.
			 * @param  {number} id      - Идентификатор метки.
			 * @param  {object} tooltip - Html элемент подсказки.
			 */
			setSelectTooltipText: function(select, id, tooltip) {

				if (!id) {
					tooltip.textContent = this.items.desc[0];
				} else if (id > select.options.length-1) {
					this.items.mark_id[indx] = 0;
					tooltip.textContent = this.items.desc[0];
				} else {
					tooltip.textContent = this.items.desc[id];
				}

			},

			count: function() {

			},

			/**
			 * Регистрирует на объект документа событие изменения и отлавливает его всплытие с элемента "select". При наступлении события заменяет идентификатор выбранной метки в массиве, пересохраняет объект меток...
			 */
			selectChange: function() {
				var that = this;
				var mark_complete;
				document.addEventListener('change', function(e) {
					var target = e.target;
					if (target.tagName == 'SELECT') {
						var lesson_id = target.parentNode.parentNode.id.replace(/\D+/g, '');
						var mark_id = target.value;
						that.items.mark_id[lesson_id] = mark_id;
						chrome.storage.local.set({'learnjavascriptmarks': JSON.stringify(that.items)});
						target.setAttribute('style', that.items.pallete[target.value]);
						target.parentNode.querySelector('.mdl-tooltip').textContent = that.items.desc[target.value];

						that.setProgress(document.getElementById('p1'));

					}
				});
			},

			/**
			 * Добавляет компонент "progress" в карту учебника.
			 * @param {string} target - Селектор заголовка карты учебника.
			 */
			addProgress: function(target) {
				var that = this;
				target = document.querySelectorAll(target)[0];
				if (!target) return;
				var p1 = document.createElement('div');
				p1.id = 'p1';
				p1.className = 'mdl-progress mdl-js-progress';
				componentHandler.upgradeElement(p1);
				target.insertAdjacentElement('afterend', p1);

				var tooltip = this.addTooltip('p1');
				p1.appendChild(tooltip);

				setTimeout(function() {
					that.setProgress(p1);
				}, 800);
			},

			/**
			 * Устанавливает процент изученного материала.
			 * @param {object} el - Html элемент компонента progress.
			 */
			setProgress: function(el) {
				var n = this.count_learned / 217 * 100;
				el.firstElementChild.style.width = n + '%';
				el.querySelector('.mdl-tooltip').textContent = 'Кол-во изученных уроков: ' + this.count_learned + ' Прогресс: ' + n.toFixed(2) + '%';
			}

		};

		getElements();
		callback(module, parents, article);

		clickInit();

	};

	/**
	 * Получает массив с метками и массив с дополнительными данными для меток из синхронизированного хранилища "chrome". При наличии записей в хранилище, копирует в новый объект массив меток и массив дом. данных.
	 * @param  {Function} callback - Возвращает объект с массивом marks, options, пустыми массивами: markd_id, progress; либо передает управление с ложным аргументом.
	 */
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
					// копирует члены объекта опшэнс в объект obj
					for (var prop in options)
						obj[prop] = options[prop];
					delete items.learnjavascriptmarks;
					delete items.learnjavascriptoptions;
					for (var prop1 in items) {
						items[prop1.replace(/\D+/g,'')] = items[prop1];
						delete items[prop1];
					}
					// копирует идентификаторы в массив
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
		var click_delay = 1000; // задежка передв вызовов основного функционала
		var time_must_spend = [300000, 60000, 60000, 60000];

		setTimeout(function() {
			init(window, document,
			 '.tutorial-map-list-three__item',
			 '.tutorial-map-list__title',
			 ['map', 'map__text'],
			 '.content article', function(mod, parents, article) {
			 	// записывает метки в объект
				mod.getAndSetMarks(marks, function() {
					// определяет страницу со статьей
					if (!parents.length && window.location.pathname != '/' && article) {
						mod.getAssocObjectOnPage(function(items, indx) {
							// передает индекс объекта для страницы со статьей
							mod.setAssocObjectMustScroll(items, indx);
							setTimeout(function() {
								mod.pageListeners();
							}, 1000);
						});
						return;
					}
					mod.mapListeners();
					mod.addControls(time_must_spend);
					mod.selectChange();
				});
			}, click_delay);
		}, click_delay);

	});


})();