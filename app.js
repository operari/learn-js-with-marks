(function() {
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
			addControls: function(marks, pallete) {
				[].forEach.call(parents, function(parent, indx) {
					var wrap =  document.createElement('div');
					var select = document.createElement('select'), option = null, id = 'parent_'+indx;
					marks.forEach(function(v, i) {
						option = document.createElement('option');
						option.value = i;
						option.innerHTML = v; 
						select.appendChild(option);
					});
					wrap.appendChild(select);
					var fe = parent.firstElementChild;
					fe.insertAdjacentElement('beforebegin', wrap);
					parent.style.display = 'flex';
					wrap.style.marginRight = '10px';
					parent.id = id;
					chrome.storage.sync.get(id, function(items) {
						var get_id = items[id];
						if (get_id && get_id != '0') {
							if (select.options[get_id]) {
								select.options.selectedIndex = get_id;
								select.setAttribute('style', pallete[get_id]);
							} else {
								select.options.selectedIndex = 0;
							}
						}
					});
				});
			},
			selectMark: function(pallete) {
				document.addEventListener('change', function(e) {
					var target = e.target;
					if (target.tagName == 'SELECT') {
						var items = {};
						items[target.parentNode.parentNode.id] = target.value;
						chrome.storage.sync.set(items);
						target.setAttribute('style', pallete[target.value]);
					}
				});
			}
		};

		if (window.location.search == search) {
			getParents();
			callback(module);
		}

		clickInit();

	};

	var marks = ['S','?', '!', '&#10003;'];
	var pallete = ['color: #000, background-color: #fff','color: #fff; background-color: #2196F3', 'color: #fff; background-color: #f44336', 'color: #fff; background-color: #4caf50'];
	var click_delay = 1000;

	chrome.storage.sync.get('learnjavascriptmarks', function(items) {

		if (!items.learnjavascriptmarks) {
			chrome.storage.sync.set({'learnjavascriptmarks': JSON.stringify(marks)});
		} else {
			marks = JSON.parse(items.learnjavascriptmarks);
		}

		setTimeout(function() {
			init(window, document, '.tutorial-map-list-three__item', 'map__text', '?map', function(mod) {
				mod.addControls(marks, pallete);
				mod.selectMark(pallete);
			}, click_delay);
		}, click_delay);

	});

})();
