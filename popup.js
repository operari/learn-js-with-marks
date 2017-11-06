// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function getCurrentTabUrl(callback) {

	var queryInfo = {
		active: true,
		currentWindow: true
	};

	chrome.tabs.query(queryInfo, (tabs) => {
		var tab = tabs[0];
		var url = tab.url;

		console.assert(typeof url == 'string', 'tab.url should be a string');

		callback(url.replace(/(.+\.ru\/)(.+)/, '$1') == 'https://learn.javascript.ru/' ? url : null);
	});

}

function saveMarks(arr) {
	var items = {};
	items['learnjavascriptmarks'] = JSON.stringify(arr);
	chrome.storage.sync.set(items);
}

function getMarks(callback) {
	chrome.storage.sync.get('learnjavascriptmarks', function(items) {
		var marks = JSON.parse(items.learnjavascriptmarks);
		callback(marks);
	});
}

function appendMarks(select, arr) {
	arr.forEach(function(v, i) {
		var opt = document.createElement('option');		
		opt.value = v;
		opt.innerHTML = v;
		select.appendChild(opt);
	});
}


function removeMarks(select) {
	while (select.firstElementChild) {
		select.removeChild(select.firstElementChild);
	}
	return !select.children.length ? true : false;
}

function events(callback) {
	var inp = document.getElementById('add_mark_inp');
	var sel = document.getElementById('dropdown');

	document.addEventListener('click', function(e) {
		var target = e.target;

		switch(target.id) {
			case 'add_mark':
				return callback(inp.value ? inp.value : false);
			case 'remove_mark':
				var selected = sel.options.selectedIndex;
				selected = sel.options[selected].value;
				return callback({'r':selected});
			default:
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	getCurrentTabUrl((url) => {
		if (!url) return;

		var dropdown = document.getElementById('dropdown');

		getMarks(function(marks) {
			if (marks) {
				appendMarks(dropdown, marks);
				events(function(val) {
					var removed = false;
					if (val && typeof(val) != 'object') {
						removed = removeMarks(dropdown);
						if (removed) {
							if (marks.indexOf(val) == -1) marks.push(val);
							appendMarks(dropdown, marks);
							saveMarks(marks);
						}
					} else {
						removed = removeMarks(dropdown);
						if (removed) {
							var i = marks.indexOf(val.r);
							if (~i) {
								marks.splice(i, 1);
								appendMarks(dropdown, marks);
								saveMarks(marks);
							}
						}
					}

				});
			}

		});
	});
});
