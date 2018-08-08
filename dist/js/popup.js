// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.с
;(function(window, document) {

	/**
	 * Получает доменное имя текущего окна с протоколом.
	 * @param  {Function} callback - Возвращает строку домена или null.
	 */
	function getCurrentTabUrl(callback) {

		var queryInfo = {
			active: true,
			currentWindow: true
		};

		chrome.tabs.query(queryInfo, function(tabs) {
			var tab = tabs[0];
			var url = tab.url;

			console.assert(typeof url == 'string', 'tab.url should be a string');
			callback(url.replace(/(.+\.ru\/)(.+)/, '$1') == 'https://learn.javascript.ru/' ? url : null);
		});

	}

	/**
	 * Сериализует данные и сохраняет в хранилище "chrome" ({key: data}).
	 * @param  {string} key - Название члена.
	 * @param  {array} data - Данные для сериализация и сохранения.
	 */
	function saveData(key, data) {
		var items = {};
		items[key] = JSON.stringify(data);
		chrome.storage.sync.set(items);
	}

	/**
	 * Получает массив символов меток из синхронизированного хранилища chrome.
	 * @param  {Function} callback - Возвращает метки.
	 */
	function getMarks(callback) {
		chrome.storage.sync.get('learnjavascriptmarks', function(items) {
			var marks = JSON.parse(items.learnjavascriptmarks);
			callback(marks);
		});
	}

	/**
	 * Получает объект с дополнительными членами: desc, pallete, progress; массивы.
	 * @param  {Function} callback - Возвращает объект с данными.
	 */
	function getOptions(callback) {
		chrome.storage.sync.get('learnjavascriptoptions', function(items) {
			var options = JSON.parse(items.learnjavascriptoptions);
			callback(options);
		});
	}

	/**
	 * Создает выпадающий список равный кол-ву меток с описанием для метки.
	 * @param  {Element} select - html элемент селект
	 * @param  {array} arr  - Массив символов меток
	 * @param  {array} arr1 - Массив описаний для меток
	 */
	function appendMarks(select, arr, arr1) {
		arr.forEach(function(v, i) {
			var opt = document.createElement('option');
			opt.value = v;
			opt.innerHTML = v + ' - ' + arr1[i];
			select.appendChild(opt);
		});
	}

	/**
	 * Удаляет все элементы выпадающего списка после первого.
	 * @param  {Element} select - Html элемент списка с метками.
	 * @return {boolean} - Истина если один элемент, иначе ложь.
	 */
	function removeMarks(select) {
		while (select.children[1]) {
			select.removeChild(select.children[1]);
		}
		return select.children.length == 1 ? true : false;
	}

	/**
	 * Ищет родителя cо св-ом "id".
	 * @param  {Element} target - Html элемент.
	 * @return {Element} - Предок или исходный элемент.
	 */
	function closest(target) {
		while (!target.id) {
			target = target.parentNode;
		}
		return target;
	}

	/**
	 * Вырезает из строки метку и описание.
	 * @param  {string} v - Текст инпута метки с описанием.
	 * @return {array} - Массив с элементом метки и описанием метки.
	 */
	function splitMarkData(v) {
		var re = /(.+?)\s?-\s?([^\s].{3,})/;
		var m = v.match(re);
		if (!m) return false;
		m.shift();

		return m;
	}

	/**
	 * Отображает метку. Присвает текст метки и цветовое оформление.
	 * @param {string} txt - Текст метки, если параметр отличен от undefined.
	 * @param {string} style - Цвет текста и фона для метки.
	 */
	function setMarkEffects(txt, style) {
		var mark = document.getElementById('mark');

		if (txt !== undefined) mark.innerHTML = (!txt  ? '' : txt);
		mark.setAttribute('style', (!style ? 'color: #000000; background-color: #ffffff' : style));

	}

	/**
	 * Очищает див с визуализацией метки.
	 */
	function clearMark() {
		var mark = document.getElementById('mark');
		mark.removeAttribute('style');
		mark.textContent = '';
	}

	/**
	 * Регистрирует события на объекте document: click, keyup; на элементе picker событие change.
	 * @param  {Function} callback - Возвращает управление с аргументами массива или объекта.
	 */
	function events(callback) {
		var inp = document.getElementById('add_mark_inp');
		var sel = document.getElementById('dropdown');

		document.addEventListener('click', function(e) {
			var target = e.target.id ? e.target : closest(e.target);
			if (!target.id) return;

			switch(target.id) {
				case 'add_mark':
					var arr = splitMarkData(inp.value);
					// добавляет в массив 3-ий элемент св-ва css: цвет текста и цвет фона
					arr.push(getInputColors());
					inp.value = '';
					clearMark();
					showMessage('Метка ' + '"' + arr[0] + '"'  + ' добавлена.');
					// передает массив: название метки, описание, цвета для визуализации
					return callback(arr);
				case 'remove_mark':
					var selected = sel.options.selectedIndex;
					selected = sel.options[selected].value;
					showMessage('Метка ' + '"' + selected + '"' + ' удалена.');
					// передает в объекте индекс выбранной метки для удаления
					return callback({'r':selected});
				case 'picker':
					setMarkEffects(undefined, getInputColors());
					break;
				default:
			}

		});

		document.addEventListener('keyup', function(e) {
			var target = e.target;

			switch (target.id) {
				case 'add_mark_inp':
					var arr = splitMarkData(target.value);
					document.getElementById('add_mark').disabled = ((arr && arr.length) ? false : true);
					// передает метку или ложь
					setMarkEffects(((arr && arr.length) ? arr[0] : false));
					break;
				default:
			}
		});

		picker.addEventListener('change', function(e) {
				var color = e.detail[0];
				picker.value = color;
				setInputColor(color);
		});

	}

	/**
	 * Задает активной радиокнопке выбранный цвет в атрибуте value.
	 * @param {string} color - Цвет в формате hex.
	 */
	function setInputColor(color) {
		var inputs = document.querySelectorAll('.inp-color');

		inputs = [].filter.call(inputs, function(el) {
			return el && el.checked;
		});

		inputs[0].value = color;

	}

	/**
	 * Собирает значение цвета (формат hex) у инпутов, помещает в массив и соединяет в строку.
	 * @return {string} Строка с цветом текста и фона.
	 */
	function getInputColors() {
		var inputs = document.querySelectorAll('.inp-color'), arr;

		arr = [].map.call(inputs, function(elem) {
			return elem && elem.value;
		});

		arr.reverse();
		arr[0] = 'color: ' + arr[0] + '; ';
		arr[1] = 'background-color: ' + arr[1];

		return arr.join('');
	}

	/**
	 * Функция парсит xml из строки, разбор svg.
	 * @param  {string} svg - Строка свг иконки
	 * @return {object}     - Объект Element - коренной элемент документа. В данном случае svg
	 */
	function parseSvg(svg) {
		var sMyString = svg;
		var oParser = new DOMParser();
		var oDOM = oParser.parseFromString(sMyString, "text/xml");

		return oDOM.documentElement;
	}

	/**
	 * Создает ссылку  - иконкой на учебник в разметке всплывающего окна.
	 */
	function addUrlTutorial() {

		var ico1 = '<svg fill="#be1622" class="link__ico1" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 5c-3.87 0-7 3.13-7 7h2c0-2.76 2.24-5 5-5s5 2.24 5 5h2c0-3.87-3.13-7-7-7zm1 9.29c.88-.39 1.5-1.26 1.5-2.29 0-1.38-1.12-2.5-2.5-2.5S9.5 10.62 9.5 12c0 1.02.62 1.9 1.5 2.29v3.3L7.59 21 9 22.41l3-3 3 3L16.41 21 13 17.59v-3.3zM12 1C5.93 1 1 5.93 1 12h2c0-4.97 4.03-9 9-9s9 4.03 9 9h2c0-6.07-4.93-11-11-11z"/></svg>';
		var ico2 = '<svg fill="#000000" class="link__ico2" height="15" viewBox="0 0 24 24" width="15" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/> <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';
		ico1 = parseSvg(ico1);
		ico2 = parseSvg(ico2);
		var url = 'https://learn.javascript.ru/?map';
		var container = document.getElementById('container_fields');
		var wrp = document.createElement('div');
		var link = document.createElement('a');
		wrp.className = 'link';
		link.href = url;
		link.className = 'link__link';
		link.target = '_blank';
		link.textContent = 'Открыть карту учебника';

		// очистка существующей разметки
		while (container.firstElementChild) {
			container.removeChild(container.firstElementChild);
		}

		wrp.appendChild(ico1);
		wrp.appendChild(link);
		wrp.appendChild(ico2);
		container.appendChild(wrp);
	}

	/**
	 * Добавляет новый элемент в переданный массив.
	 * @param  {array} arr - Массив с элементами.
	 * @param  {string} elem - Новый элемент для добавления.
	 * @return {array} Массив с новым доп. элементом.
	 */
	function pushElemToDataArray(arr, elem) {
		if (arr.indexOf(elem) == -1) arr.push(elem);
		return arr;
	}

	/**
	 * Вызывает метод "уведомление" из библиотеки mdl.
	 * @param  {string} msg - Строка уведомления.
	 */
	function showMessage(msg) {
    var data = { message: msg};
    document.getElementById('message').MaterialSnackbar.showSnackbar(data);
	}

	document.addEventListener('DOMContentLoaded', function() {
		getCurrentTabUrl(function(url) {

			// если неподходящее имя домена - то инструкция добавляет ссылку на учебник и останавливает выполнение программы
			if (!url) {
				addUrlTutorial();

				return;
			}

			var dropdown = document.getElementById('dropdown');

			// получает массив символов меток
			getMarks(function(marks) {
				if (marks) {
					// получает доп. данные
					getOptions(function(options) {
						// заполняет select (Удалить метку) метками из хранилища
						appendMarks(dropdown, marks, options.desc);
					});
					events(function(val) {
						var removed = false;
						// если val не пустой массив (возвращенный параметр после нажатия на кнопку добавить метку)
						if (val && val.length) {
							removed = removeMarks(dropdown);
							if (removed) {
								// добавляет новую метку введенную в инпут
								marks = pushElemToDataArray(marks, val[0]);
								saveData('learnjavascriptmarks', marks);
								// получает доп. данные после события клика
								getOptions(function(options) {
									if (options) {
										// добавляет описание введенное в инпут для новой метки
										options.desc = pushElemToDataArray(options.desc, val[1].toLowerCase());
										// добавляет цвет текста и фона в палитру для новой метки
										options.pallete.push(val[2]);
										// заполняет select (Удалить метку) новыми метками
										appendMarks(dropdown, marks, options.desc);
										saveData('learnjavascriptoptions', options);
									}
								});
							}
						// если val объект (возвращенный параметр после нажатия кнопки удаления метки)
						} else {
							removed = removeMarks(dropdown);
							if (removed) {
								var i = marks.indexOf(val.r);
								// если индекс не равен -1
								if (~i) {
									// вырезает из массива элемент по переданному индексу
									marks.splice(i, 1);
									saveData('learnjavascriptmarks', marks);
									getOptions(function(options) {
										if (options.desc && options.desc.length) {
											// вырезает элемент ассоциативный метке из массива описания и палитры с цветами
											options.desc.splice(i, 1);
											options.pallete.splice(i, 1);
											appendMarks(dropdown, marks, options.desc);
											saveData('learnjavascriptoptions', options);
										}
									});
								}
							}
						}

					});
				}

			});
		});
	});

})(window, document);