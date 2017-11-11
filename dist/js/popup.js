// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
;(function(window, document) {
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

	function saveData(key, data) {
		var items = {};
		items[key] = JSON.stringify(data);
		chrome.storage.sync.set(items);
	}

	function getMarks(callback) {
		chrome.storage.sync.get('learnjavascriptmarks', function(items) {
			var marks = JSON.parse(items.learnjavascriptmarks);
			callback(marks);
		});
	}

	function getOptions(callback) {
		chrome.storage.sync.get('learnjavascriptoptions', function(items) {
			var options = JSON.parse(items.learnjavascriptoptions);
			callback(options);
		});
	}

	function appendMarks(select, arr, arr1) {
		arr.forEach(function(v, i) {
			var opt = document.createElement('option');
			opt.value = v;
			opt.innerHTML = v + ' - ' + arr1[i];
			select.appendChild(opt);
		});
	}

	function removeMarks(select) {
		while (select.children[1]) {
			select.removeChild(select.children[1]);
		}
		return select.children.length == 1 ? true : false;
	}

	function closest(target) {
		while (!target.id) {
			target = target.parentNode;
		}
		return target;
	}

	function splitMarkData(v) {
		var re = /(.+?)\s?-\s?([^\s].{3,})/;
		var m = v.match(re);
		if (!m) return false;
		m.shift();

		return m;
	}

	function setMarkEffects(txt, style) {
		var mark = document.getElementById('mark');

		if (txt !== undefined) mark.innerHTML = (!txt  ? '' : txt);
		mark.setAttribute('style', (!style ? 'color: #000000; background-color: #ffffff' : style));

	}

	function clearMark() {
		var mark = document.getElementById('mark');
		mark.removeAttribute('style');
		mark.textContent = '';
	}

	function events(callback) {
		var inp = document.getElementById('add_mark_inp');
		var sel = document.getElementById('dropdown');

		document.addEventListener('click', function(e) {
			var target = e.target.id ? e.target : closest(e.target);
			if (!target.id) return;

			switch(target.id) {
				case 'add_mark':
					var arr = splitMarkData(inp.value);
					arr.push(getInputColors());
					inp.value = '';
					clearMark();
					showMessage('Метка ' + '"' + arr[0] + '"'  + ' добавлена.');
					return callback(arr);
				case 'remove_mark':
					var selected = sel.options.selectedIndex;
					selected = sel.options[selected].value;
					showMessage('Метка ' + '"' + selected + '"' + ' удалена.');
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

	function setInputColor(color) {
		var inputs = document.querySelectorAll('.inp-color');

		inputs = [].filter.call(inputs, function(el) {
			return el && el.checked;
		});

		inputs[0].value = color;

	}
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

	function parseSvg(svg) {
		var sMyString = svg;
		var oParser = new DOMParser();
		var oDOM = oParser.parseFromString(sMyString, "text/xml");

		return oDOM.documentElement;
	}

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

		while (container.firstElementChild) {
			container.removeChild(container.firstElementChild);
		}

		wrp.appendChild(ico1);
		wrp.appendChild(link);
		wrp.appendChild(ico2);
		container.appendChild(wrp);
	}

	function pushElemToDataArray(arr, elem) {
		if (arr.indexOf(elem) == -1) arr.push(elem);
		return arr;
	}

	function showMessage(msg) {
    var data = { message: msg};
    document.getElementById('message').MaterialSnackbar.showSnackbar(data);
	}

	document.addEventListener('DOMContentLoaded', function() {
		getCurrentTabUrl(function(url) {
			if (!url) {
				addUrlTutorial();
				return;
			}

			var dropdown = document.getElementById('dropdown');

			getMarks(function(marks) {
				if (marks) {
					getOptions(function(options) {
						appendMarks(dropdown, marks, options.desc);
					});
					events(function(val) {
						var removed = false;
						if (val && val.length) {
							removed = removeMarks(dropdown);
							if (removed) {
								marks = pushElemToDataArray(marks, val[0]);
								saveData('learnjavascriptmarks', marks);
								getOptions(function(options) {
									if (options) {
										options.desc = pushElemToDataArray(options.desc, val[1].toLowerCase());
										options.pallete.push(val[2]);
										appendMarks(dropdown, marks, options.desc);
										saveData('learnjavascriptoptions', options);
									}
								});
							}
						} else {
							removed = removeMarks(dropdown);
							if (removed) {
								var i = marks.indexOf(val.r);
								if (~i) {
									marks.splice(i, 1);
									saveData('learnjavascriptmarks', marks);
									getOptions(function(options) {
										if (options.desc && options.desc.length) {
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