(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var { DOM, socket, cookie } = require('kem/dom');

module.exports = class FormChat extends DOM {
	constructor(props) {
		super(props);
		this.click = { show: 0, icon: 0 };
		this.connected = 0;
		this.state = { chat: [] };
		this.input_file = DOM.x("input", { type: "file", accept: "image/jpg, image/png, image/jpeg, image/gif", onchange: this.upload_action.bind(this) });
	}
	componentDidMount() {
		// if(cookie.has('token')){
		// 	socket.emit('authenticate', cookie.get('token'), function(user){
		// 		// 
		// 	});
		// }else{
		// 	socket.emit('connect', function(token){
		// 		// 
		// 	});
		// }
	}
	toggle_form(e) {
		var btn = e.target,
		    form = this.dom.find('form');

		if (++this.click.show % 2) {
			form.show();
			btn.changeClass('form-chat-show', 'form-chat-hide');
		} else {
			form.hide();
			btn.changeClass('form-chat-hide', 'form-chat-show');
		}
	}
	submit(e) {
		var form = this.find('form'),
		    txt = form.find('textarea');

		socket.emit('chat', {
			content: txt.val(),
			time: Date.now()
		});

		txt.val('');
	}
	componentWillMount() {
		socket.on('chat', data => {
			this.emit('chat', data);
		});

		this.btn_icon = this.dom.find('.ld-composer-popover');
		this.footer = this.dom.find('.relative > form > footer');
		this.textarea = this.footer.find('textarea');
		this.textarea.onfocus = () => {
			this.footer.style.backgroundColor = '#FFFFFF';
		};
		this.textarea.onblur = () => {
			this.footer.style.backgroundColor = '#f4f7f9';
		};
	}

	before_upload() {
		this.input_file.click();
	}
	upload_action(e) {
		console.log(e.target.files[0]);
	}

	show_icon() {
		++this.click.icon % 2 ? this.btn_icon.show() : this.btn_icon.hide();
	}

	focus_text() {
		// this.footer.style.backgroundColor = '#FFFFFF';
		this.textarea.focus();
	}
	write_text(e) {
		if (e.keyCode === 13 && !e.shiftKey) this.submit();
	}

	render() {
		return DOM.x(
			"div",
			{ className: "form-chat fixed" },
			DOM.x(
				"div",
				{ className: "relative" },
				DOM.x(
					"form",
					{ className: "chat-form absolute hidden" },
					DOM.x(
						"header",
						null,
						DOM.x(
							"header",
							null,
							DOM.x(
								"div",
								{ className: "ld-team-profile-full-team-name" },
								"Intercom"
							),
							DOM.x(
								"div",
								{ className: "ld-team-profile-full-response-delay" },
								"Typically replies in under 3h"
							)
						),
						DOM.x(
							"section",
							null,
							DOM.x(
								"div",
								{ className: "ld-team-profile-full-avatar ld-index-0" },
								DOM.x(
									"div",
									{ className: "ld-avatar" },
									DOM.x("img", { src: "https://static.intercomassets.com/avatars/656461/square_128/IMG_1744-1472721461.jpg?1472721461" })
								),
								DOM.x(
									"div",
									{ className: "ld-team-profile-full-admin-name" },
									"Jade"
								)
							),
							DOM.x(
								"div",
								{ className: "ld-team-profile-full-avatar ld-index-1" },
								DOM.x(
									"div",
									{ className: "ld-avatar" },
									DOM.x("img", { src: "https://static.intercomassets.com/avatars/725453/square_128/Slack-1484281488.jpg?1484281488" })
								),
								DOM.x(
									"div",
									{ className: "ld-team-profile-full-admin-name" },
									"Jon"
								)
							),
							DOM.x(
								"div",
								{ className: "ld-team-profile-full-avatar ld-index-2" },
								DOM.x(
									"div",
									{ className: "ld-avatar" },
									DOM.x("img", { src: "https://static.intercomassets.com/avatars/1180817/square_128/Avatar-1493409816.png?1493409816" })
								),
								DOM.x(
									"div",
									{ className: "ld-team-profile-full-admin-name" },
									"Samuel"
								)
							)
						),
						DOM.x(
							"footer",
							null,
							DOM.x(
								"span",
								null,
								"We make it simple and seamless for businesses and people to talk to each other. Ask us anything ",
								DOM.x("span", { style: "display:inline-block;height:16px;width:16px;background-position:-304px -368px;", title: "grinning", className: "ld-icon ld-emoji-sub-icon" })
							)
						)
					),
					DOM.x(
						"section",
						{ onmousedown: this.focus_text.bind(this) },
						DOM.x(
							"ul",
							null,
							this.state.chat.push(function (chat) {
								return DOM.x(
									"li",
									null,
									chat.content
								);
							})
						)
					),
					DOM.x(
						"footer",
						{ className: "absolute" },
						DOM.x(
							"div",
							{ className: "relative" },
							DOM.x(
								"div",
								{ className: "absolute", onmousedown: this.focus_text.bind(this) },
								DOM.x("textarea", { placeholder: "Send a message\u2026", onkeyup: this.write_text.bind(this) })
							),
							DOM.x(
								"div",
								{ className: "absolute" },
								DOM.x("button", { type: "button", className: "ld-composer-emoji-button", onmousedown: this.show_icon.bind(this) }),
								DOM.x("button", { type: "button", className: "ld-composer-upload-button", onmousedown: this.before_upload.bind(this) })
							),
							DOM.x(
								"div",
								{ className: "ld-composer-popover absolute hidden" },
								DOM.x(
									"div",
									{ className: "relative" },
									DOM.x(
										"div",
										{ className: "ld-composer-popover-emoji" },
										DOM.x("span", { title: ":-)", style: "background-position: -304px -368px;" }),
										DOM.x("span", { title: ":-D", style: "background-position: -352px -368px;" }),
										DOM.x("span", { title: ";-)", style: "background-position: -384px -64px;" }),
										DOM.x("span", { title: "}-)", style: "background-position: -208px -288px;" }),
										DOM.x("span", { title: ":-O", style: "background-position: -272px -384px;" }),
										DOM.x("span", { title: ":-\\", style: "background-position: -384px -256px;" }),
										DOM.x("span", { title: "X-(", style: "background-position: -192px -384px;" }),
										DOM.x("span", { title: ":-(", style: "background-position: -16px -384px;" }),
										DOM.x("span", { title: "B-)", style: "background-position: -384px -144px;" }),
										DOM.x("span", { title: ":-P", style: "background-position: -384px -352px;" }),
										DOM.x("span", { title: ":-@", style: "background-position: -48px -384px;" }),
										DOM.x("span", { title: ":-|", style: "background-position: -384px -176px;" })
									),
									DOM.x("div", { className: "ld-composer-popover-caret absolute" })
								)
							)
						)
					)
				),
				DOM.x("button", { type: "button", className: "button-show-form-chat form-chat-show absolute", onmousedown: this.toggle_form.bind(this) })
			)
		);
	}
};
},{"kem/dom":2}],2:[function(require,module,exports){
module.exports.Event = require('../lib/event');
module.exports.DOM = require('./lib/dom.js');
module.exports.Link = require('./plugin/link.js');
module.exports.Modal = require('./plugin/modal.js');

module.exports.app = require('./plugin/router.js');

module.exports.cache = require('../lib/cache.js');
module.exports.session = require('./plugin/session.js');
module.exports.local = require('./plugin/local.js');

module.exports.WS = require('../lib/socket.js');
module.exports.async = require('../lib/async.js');
module.exports.Check = require('../lib/check.js');
module.exports.cookie = require('../lib/cookie/index.js');
module.exports.is = require('../lib/is.js');
},{"../lib/async.js":14,"../lib/cache.js":15,"../lib/check.js":16,"../lib/cookie/index.js":17,"../lib/event":18,"../lib/is.js":19,"../lib/socket.js":20,"./lib/dom.js":5,"./plugin/link.js":9,"./plugin/local.js":10,"./plugin/modal.js":11,"./plugin/router.js":12,"./plugin/session.js":13}],3:[function(require,module,exports){
var StateNode = require('./state-node');

module.exports = function AppendChild(children, node) {

	for (let i = 0, n = children.length; i < n; i++) {
		var child = children[i];
		switch (typeof child) {
			case 'string':
			case 'number':
				node.insertAdjacentHTML('beforeend', child);
				break;
			case 'function':
				setTimeout(function () {
					child(node);
				});
				break;
			case 'object':
				if (child) {
					if (Array.isArray(child)) {
						AppendChild(child, node);
					}else if (child.nodeType) {
						node.appendChild(child);
					}else if (child.isState) {
						StateNode(child, node);
					}else if (child.name) {
						child.self.on(child.name, child.fn.bind(node));
					}
				} else {
					node.appendChild(document.createTextNode(''));
				};
				break;
		}
	};

	return node;
};
},{"./state-node":8}],4:[function(require,module,exports){
module.exports = function Attribute(attributes, node) {
	for (var key in attributes) {
		var value = attributes[key];
		switch (typeof value) {
			case 'string':
				node[key] = value;
				break;
			case 'function':
				'node' === key ? value(node) : node[key] = value;
				break;
			case 'object':
				if (Array.isArray(value)) {
					var dom = document.createDocumentFragment();

					for (var i = 0, n = value.length; i < n; i++) {
						var val = value[i], child;

						if ('object' === typeof val) {
							child = document.createTextNode(val.value);
							val.on(function (attrVal) {
								child.nodeValue = attrVal;
								node[key] = dom.textContent;
							});
						} else {
							child = document.createTextNode(val);
						};
						dom.appendChild(child);
					};
					node[key] = dom.textContent;
				} else if (value.isState) {
					if ('style' === key) {
						// <div style={this.state.style}</div>
						// <div style={this.state.style.css(function(data){ return data })}
						value.__cssAction(node);
					} else {
						node[key] = value.value;

						value.on(function (attrVal) {
							'boolean' === typeof attrVal ? attrVal ? node.setAttribute(key, "true") : node.removeAttr(key) : node[key] = attrVal;
						});
					}
				} else {
					Object.assign(node, attributes);
				};
				break;
		}
	}

	return node;
}
},{}],5:[function(require,module,exports){
var StateElement = require('./state-element.js'),
	AppendChild = require('./append-child.js'),
	Attribute = require('./attribute.js'),
	Event = require('../../lib/event.js');

module.exports = class DOM extends Event {
	constructor(props) {
		super();

		this.props = props || {};
		this.define = {};
	}

	apply(data) {
		Object.assign(this.define, data);
	}

	set(key, value) {
		this.define[key] = value;
	}
	get(key) {
		return this.define[key] || '';
	}
	get done() {
		if (this.componentDidMount) this.componentDidMount();
		if (this.state) this._ps();

		this.dom = this.render() || document.createComment('');
		this.dom._event = this._event;

		if (this.init) this.init();
		if (this.componentWillMount) this.componentWillMount();

		return this.dom;
	}

	_ps() {
		for (var i in this.state) {
			this.state[i] = new StateElement(i, this.state[i], this);
		}
	}

	setState(list) {
		for (var i in list) {
			this.emit(i, list[i]);
		}
	}

	find(selector) {
		return this.dom.find(selector);
	}
	findAll(selector) {
		return this.dom.findAll(selector);
	}
	css(option) {
		var dom = this.dom.querySelector('style'),
		    arr = [];

		if (!dom) {
			dom = document.createElement('style');
			this.dom.prepend(dom);
		};

		setTimeout(function () {
			for (var className in option) {
				var item = [],
				    cls = option[className];
				for (var key in cls) {
					item.push(key + ':' + cls[key]);
				};
				arr.push(className + '{' + item.join(';') + '}');
			};

			dom.append(arr.join(''));
		}, 0);
	}

	remove() {
		DOM.GD(this, 0).remove();
	}

	static x(tag, attr, ...children) {
		switch (typeof tag) {
			case 'function':
				var node = new tag(Object.assign({}, attr, { children }));
				return node.done;
			case 'string':
				var node = document.createElement(tag);
				Attribute(attr || {}, node);
				AppendChild(children, node);
				return node;
			default:
				return null;
		}
	}

	static GD(node, i) {
		if (i > 3) return null;
		if (node && node.dom && node.dom.nodeType) return node.dom;

		DOM.GD(node, ++i);
	}
	static render(Node, parent) {
		parent.appendChild(DOM.GD(Node, 0));
	}
}
},{"../../lib/event.js":18,"./append-child.js":3,"./attribute.js":4,"./state-element.js":6}],6:[function(require,module,exports){
var ArrayAction = require('./state-event');

module.exports = class StateElement {
	constructor(name, value, rootNode) {
		this.isState = 1;
		this.name = name;
		this.value = value;
		this.rootNode = rootNode;
	}

	concat(array) {
		return array.__concat();
	}

	on(fn) {
		this.rootNode.on(this.name, fn);
	}

	__cssAction(node) {
		function callback(value) {
			if (value !== null) {
				'object' === typeof value ? Object.assign(node.style, value) : node.setAttribute('style', value);
			}
		};
		var fn = this.action;

		if (fn) {
			if (this.value !== null) callback(fn.call(null, this.value));
			this.rootNode.on(this.name, function css(data) {
				if (data !== null) callback(fn.call(this, data));
			});
		} else {
			if (this.value !== null) callback(this.value);
			this.rootNode.on(this.name, callback);
		}
	}
	css(fn) {
		/**
		   *	- fn return a string for attribute style
		   * 	- fn argument is an object, string, number
		   *
		   *	- this.setState({style: {width: 10, height: 20}})
		   *  - <div style={this.state.style.css(function(data){ return `width: ${data.width}px; height: ${data.height}%` })} />
		   *	
		   */
		var state = new StateElement(this.name, this.value, this.rootNode);
		state.action = fn;
		return state;
	}

	push(fn) {
		/**
		   *	- fn return an element
		   * 	- fn argument is an array, object, string, number or null, not an element
		   * 	- this.setState({friend: argument});
		   *
		   *	- <div>
		   * 		{this.state.friend.push(function(data){
		   *			return <li>...</li>
		   *		})}
		   *	- </div>
		   */

		var array = new ArrayAction();

		this.rootNode.on(this.name, function push(data) {
			// if is_array && array.is_concat => append
			// if is_array && !array.is_concat => replace
			if (data) {
				if (Array.isArray(data)) {
					if (data.length) {
						if (data.__concat) {
							// append list
							return array.append(array.appendArray(data.map(fn), document.createDocumentFragment()));
						} else {
							// replace list
							return array.replace(array.append(data.map(fn), document.createDocumentFragment()));
						}
					} else {
						// remove child
						return array.remove();
					}
				} else {
					return array.append(fn.call(this, data));
				}
			};

			return array.remove();
		});

		return array.started(this.value.map(fn));
	}

	unshift(fn) {
		/**
   *	- fn return an element
   * 	- fn argument is an array, object, string, number or null, not an element
   * 	- this.setState({friend: argument});
   *
   *	- <div>
   * 		{this.state.friend.prepend(function(data){
   *			return <li>...</li>
   *		})}
   *	- </div>
   */

		var array = new ArrayAction();

		this.rootNode.on(this.name, function unshift(data) {
			// if is_array && array.is_concat => append
			// if is_array && !array.is_concat => replace
			if (data) {
				if (Array.isArray(data)) {
					if (data.length) {
						if (data.__concat) {
							// prepend list
							return array.prepend(array.appendArray(data.map(fn), document.createDocumentFragment()));
						} else {
							// replace list
							return array.replace(array.appendArray(data.map(fn), document.createDocumentFragment()));
						}
					} else {
						// remove child
						return array.remove();
					}
				} else {
					return array.prepend(fn.call(this, data));
				}
			};

			return array.remove();
		});

		return array.started(this.value.map(fn));
	}

	text(fn) {
		var dom = document.createTextNode(this.value);
		dom.nodeValue = fn(this.value);

		this.rootNode.on(this.name, function (data) {
			dom.nodeValue = fn.call(this, data);
		});
		return dom;
	}

	update(fn) {
		/**
		   *	- fn return an element
		   * 	- fn argument is an array, object, string or number, not an element
		   * 	- this.setState({friend: argument});
		   *
		   * 	- <div>{this.state.friend.update(function(data){ return <Friend /> })}</div>
		   * 	- <div>
		   *		{this.state.friend.update(function(data){
		   *			var fragment = document.createDocumentFragment();
		   *			for(var i = 0, n = data.length; i < n; i++){
		   *				fragment.appendChild(...);
		   *			};
		   *			return fragment;
		   *		})}
		   *	- </div>
		   */
		var array = new ArrayAction();

		this.rootNode.on(this.name, function update(data) {
			array.replace(data ? fn.call(this, data) : null);
		});

		return array.start_replace(this.value, fn);
	}
};
},{"./state-event":7}],7:[function(require,module,exports){
class ArrayAction {
	constructor() {
		this.start = new Comment();
		this.end = new Comment();
	}

	get parent() {
		if (!this._parent) this._parent = this.start.parentElement;
		return this._parent;
	}
	get next() {
		var next = this.start.nextSibling;
		this.is_element = next && next.nodeType !== 8;
		return next;
	}

	started(data) {
		var frag = document.createDocumentFragment();
		frag.appendChild(this.start);
		this.appendArray(data, frag);
		frag.appendChild(this.end);
		return frag;
	}
	start_replace(data, fn) {
		var frag = document.createDocumentFragment();
		frag.appendChild(this.start);
		if (data) frag.append(fn(data));
		frag.appendChild(this.end);
		return frag;
	}

	appendArray(array, frag) {
		for (var i = 0, count = array.length; i < count; i++) {
			frag.append(array[i]);
		};
		return frag;
	}

	__append(dom) {
		if (/string|number/.test(typeof dom)) dom = document.createTextNode(dom);
		// new dom insert before end_comment
		this.parent.insertBefore(dom, this.end);
	}
	__prepend(dom) {
		if (/string|number/.test(typeof dom)) dom = document.createTextNode(dom);
		// new dom insert after start_comment
		this.parent.insertBefore(dom, this.start.nextSibling);
	}

	append(fragment) {
		fragment.childNodes.length ? this.__append(fragment) : this.remove();
	}

	prepend(fragment) {
		fragment.childNodes.length ? this.__prepend(fragment) : this.remove();
	}

	replace(dom) {
		this.remove();
		if (dom) this.__append(dom);
	}

	remove(not_remove) {
		var next = this.start.nextSibling,
		    tmp_node;

		// if between 2 comments has node => devare its
		// if is comment then break;

		while (next.nodeType !== 8) {
			tmp_node = next;
			next = next.nextSibling;
			tmp_node.remove();
		}
	}
};

module.exports = ArrayAction;
},{}],8:[function(require,module,exports){
module.exports = function StateNode(state, node){

	var value = state.value, fn = function(data){ return data }, child;

	switch(typeof(value)){
		case 'object':
			if(Array.isArray(value)) child = state.push(fn);
			else child = value ? (value.nodeType ? value : state.update(fn)) : state.update(fn);
			break;
		case 'string':
		case 'number':
			child = state.text(fn);
			break;
	}

	if(child) node.appendChild(child);

	return node;
}
},{}],9:[function(require,module,exports){
var app = require('./router.js'),
	DOM = require('../lib/dom.js');

module.exports = class Link extends DOM {

	constructor(props) {
		super(props);
		this.handleClick = this.props.action || this.handleClick.bind(this);
	}

	handleClick(e) {
		if (this.props.to) return Link.to(this.props.to);
		if (this.props.remove) return $(this.props.remove).remove();
		if (this.props.modal) return Link.modal(this.props.modal, this.props.data);
	}

	render() {
		return DOM.x(
			'a',
			{ id: this.props.id,
				onmousedown: this.handleClick,
				className: this.props.className,
				style: this.props.style
			},
			this.props.children
		);
	}

	static modal(ModalBox, props) {
		app.dom.appendChild(DOM.x(ModalBox, props));
	}

	static to(path) {
		app.emit('render', path);
	}
}
},{"../lib/dom.js":5,"./router.js":12}],10:[function(require,module,exports){
module.exports = {
	set: function(object){
		Object.assign(localStorage, object)
	},
	get: function(key){
		return localStorage.getItem(key)
	},
	has: function(key){
		return localStorage.hasOwnProperty(key)
	},
	remove: function(...array){
		if(array.length){
			array.forEach(function(key){
				localStorage.removeItem(key)
			})
		}else{
			localStorage.clear()
		}
	}
}
},{}],11:[function(require,module,exports){
var DOM = require('../lib/dom.js');

module.exports = class Modal extends DOM {

	_close(e) {
		if (/^(modal|modal\-close)$/.test(e.target.className)) this.emit('close');
	}

	get btn_close() {
		if (!this._btn_close) {
			this._btn_close = DOM.x(
				'div',
				{ className: 'pull-left' },
				DOM.x('a', { className: 'modal-close', onclick: this._close.bind(this) })
			)
		}
		return this._btn_close;
	}

	get btn_next() {
		if (!this._btn_next) {
			this._btn_next = DOM.x(
				'div',
				{ className: 'pull-right' },
				DOM.x('a', { className: 'modal-done', onclick: this.next.bind(this) })
			)
		}
		return this._btn_next;
	}

	_header() {
		if (!this.header) return null;
		return DOM.x(
			'header',
			{ className: 'clearfix' },
			this.next ? this.btn_close : null,
			DOM.x(
				'div',
				{ className: 'pull-left', style: 'margin-left: 12px;' },
				DOM.x(
					'span',
					{ className: 'modal-text' },
					this.header()
				)
			),
			this.next ? this.btn_next : this.btn_close
		);
	}

	init() {
		var self = this,
		    fn = function () {
			self.remove();
		};
		if (this.notFull) {
			var content = this.find('.modal-content');
			content.css({
				top: (window.innerHeight - content.offsetHeight) / 4 - 10 + 'px'
			});
		};
		this.on('done', fn);
		this.on('close', fn);
	}

	render() {
		return DOM.x(
			'div',
			{ className: 'modal', onclick: this._close },
			DOM.x(
				'div',
				{ className: this.notFull ? 'modal-content' : 'modal-content fullsize' },
				this._header(),
				this.section(),
				this.footer ? this.footer() : null
			)
		);
	}
}
},{"../lib/dom.js":5}],12:[function(require,module,exports){
var DOM = require('../lib/dom.js'), 
	$app = document.getElementById('app');

var App = module.exports = {
	pushState: true,
	routes: [],
	event: {},
	define: {},
	dom: $app,

	set: function(key, value){
		if('string' === typeof key) this.define[key] = value;
		else Object.assign(this.define, key);
	},
	get: function(key){
		return this.define[key];
	},
	has: function(key){
		return this.define.hasOwnProperty(key);
	},
	del: function(...array){
		for(var i = 0, n = array.length; i < n; i++){
			delete this.define[array[i]];
		}
	},
	on: function(name, fn){
		this.event[name] = fn;
	},
	emit: function(name, ...data){
		var fn = this.event[name];
		if(fn) fn.apply(this, data);
	},

	error: function(Div){
		this.routes.push({ fn: function(){ App.emit('error', Div) }});
	},

	use: function(){
		switch(arguments.length){
			case 1:
				this.routes.push({ fn: arguments[0] });
				return;
			case 2:
				this.routes.push({ uri: new RegExp('^' + arguments[0] + '$'), fn: arguments[1] });
				return;
			case 3:
				if('string' === typeof arguments[2]){
					this.routes.push({ uri: new RegExp('^' + arguments[0] + '$'), fn: arguments[1], action: arguments[2] });
				}else{
					this.routes.push({ uri: new RegExp('^' + arguments[0] + '$'), fn: arguments[2], check: arguments[1] });
				};
				return;
			case 4:
				this.routes.push({ uri: new RegExp('^' + arguments[0] + '$'), fn: arguments[2], check: arguments[1], action: arguments[3] });
		}
	},
	handle: function(){

		var routes = this.routes, 
			n = routes.length - 1,
			comment = 1,
			r, route, controller, fn;

		$app.appendChild(new Comment());

		this.on('render', function(pathname){
			if(App.pushState){
				window.history.replaceState(null, null, pathname)
			}

			function next(i){
				if(i > n) return App.emit('error');

				route = routes[i];

				if(route.uri){
					if(r = route.uri.exec(pathname)){

						if(!controller) controller = new route.fn();

						function finish(){
							var promise = new Promise(function(resolve){
								if(route.fn.name !== controller.constructor.name) return resolve(new route.fn());

								if(comment){
									resolve(controller);
									comment = 0;
								}else{
									if(fn = (controller[route.action || r[1]] || controller.index)){
										controller.emit('section', DOM.x(fn.apply(controller, r.slice(2))));
									}else{
										next(n);
										promise = null;
									}
								}
							});
							promise.then(function(c){
								if(fn = (c[route.action || r[1]] || c.index)){
									$app.replaceChild(c.done, $app.childNodes[0]);
									c.emit('section', DOM.x(fn.apply(c, r.slice(2))));
									if(c.header) c.emit('header', c.header());
								}else{
									next(n)
								}
							});
						}

						return route.check ? route.check(finish) : finish()
					}else{
						next(++i);
					}
				}else{
					route.fn(function(){ next(++i) })
				}
			}

			next(0);
		});

		this.on('error', function(Div){
			$app.replaceChild(DOM.x(Div), $app.childNodes[0])
		});

		if(App.pushState){
			window.addEventListener('popstate', function (){
				App.emit('render', window.location.pathname)
			});
			this.emit('render', window.location.pathname);
		}else{
			this.emit('render', '/')
		}
	}
}
},{"../lib/dom.js":5}],13:[function(require,module,exports){
module.exports = {
	has: function(key){
		return sessionStorge.hasOwnProperty(key)
	},
	get: function(key){
		return sessionStorge.getItem(key)
	},
	set: function(object){
		Object.assign(sessionStorge, object)
	},
	remove: function(...array){
		if(array.length){
			array.forEach(function(key){
				sessionStorge.removeItem(key)
			})
		}else{
			sessionStorge.clear()
		}
	}
}
},{}],14:[function(require,module,exports){
function async(fn){
	setTimeout(fn)
}

async.run = function(array){
	for(var i = 0, n = array.length; i < n; i++){
		setTimeout(array[i])
	}
}

async.each = function(array, fn){
	for(let i = 0, n = array.length; i < n; i++){
		setTimeout(function(){ fn(array[i], i) })
	}
}

async.map = function(array, fn){
	if(array.length){
		Promise.all(array.map(function(item){
			return new Promise(function(resolve, reject){ 
				item(function(error, data){ error ? reject(data) : resolve(data) }) 
			})
		})).then(fn)
	}else{
		var array_task = [], array_key = Object.keys(array), result = {};

		for(let i in array){
			array_task.push(new Promise(function(resolve, reject){ 
				array[i](function(error, data){ error ? reject(data) : resolve(data) }) 
			}))
		}

		Promise.all(array_task).then(function(data){
			for(var i = 0, n = array_key.length; i < n; i++){
				result[array_key[i]] = data[i]
			}

			fn(result)
		})
	}
}

module.exports = async;
},{}],15:[function(require,module,exports){
var cache = module.exports = {
	_set: {},
	_hset: {},

	/* using for _set */
	set: function (key, val) {
		this._set[key] = val;
	},
	has: function (key) {
		return this._set.hasOwnProperty(key);
	},
	get: function (key) {
		return this._set[key];
	},
	mset: function (list) {
		Object.assign(this._set, list);
	},
	del: function (key) {
		delete this._set[key];
	},
	push: function (key, value) {
		this.has(key) ? this._set[key].push(value) : this._set[key] = [value];
	},
	pull: function (key, condition) {
		var array = this._set[key];
		if (array) this._set[key].remove(condition);
	},

	/* using for _hset */
	hset: function (hash, key, value) {
		this._hset[hash] = this._hset[hash] || {};
		this._hset[hash][key] = value;
	},
	hmset: function (hash, list) {
		/* multi hash set */
		this._hset[hash] = this._hset[hash] || {};
		Object.assign(this._hset[hash], list);
	},
	hget: function (hash, key) {
		var value = this._hset[hash];
		return value ? value[key] : null;
	},
	hgetall: function (hash) {
		return this._hset[hash];
	},
	hdel: function (hash, key) {
		if (key) {
			if (this._hset.hasOwnProperty(hash)) delete this._hset[hash][key];
		} else {
			delete this._hset[hash];
		}
	},

	/* the other */
	is: function (hash, key, value) {
		return 'undefined' === typeof value ? key === this.get(hash) : value === this.hget(hash, key);
	}
	
}
},{}],16:[function(require,module,exports){
var trim = require('./trim'),
	method = ['get', 'put', 'post', 'delete', 'patch'],
	ShareWith = ['people', 'friend', 'me'],
	LikeName = ['haha', 'like', 'love', 'sad', 'ungry', 'wow'],
	ListUserNameFound = ['setting', 'account', 'post', 'message'];

module.exports = class Check {
	constructor() {
		this._error = {};
		this.error = 0;
	}
	set(key, value) {
		this.error++;
		this._error[key] = value;
		return false;
	}
	get(key) {
		return this._error[key];
	}
	getError() {
		return this._error;
	}
	like(name) {
		return !(LikeName.indexOf(name) < 0);
	}
	md5(value) {
		return 'string' === typeof value && value.length === 32;
	}
	sha1(value) {
		return 'string' === typeof value && value.length === 40;
	}
	id(value) {
		return 'number' === typeof value && value > 0;
	}
	number(value) {
		return 'number' === typeof value && value >= 0;
	}
	string(value) {
		return 'string' === typeof value;
	}
	empty(value) {
		return !value;
	}
	boolean(value) {
		return 'boolean' === typeof value;
	}
	object(value) {
		return '[object Object]' === value.toString();
	}
	array(value) {
		return Array.isArray(value);
	}
	method(name) {
		return -1 !== method[name];
	}
	share_with(role) {
		return ShareWith.indexOf(role) > -1;
	}
	date(date) {
		return !(date == 'Invalid Date');
	}
	name(n) {
		var type,
		    name = trim(n || ''),
		    count = name.length;
		/* check length */
		if (count < 2) type = 'name_short';else if (count > 30) type = 'name_long';else {
			/* word count */
			if (name.split(' ').length > 2) type = 'name_many_word';else {
				/* ki tu dac biet */
				var reg = /[~`!@#\$%\^&\*\(\)_\+\-=\{\}\[\]\\:\';\'<>\?\,\.\/\|\d]+/g;
				if (reg.test(name)) type = 'error_name';else {
					/* ki tu in hoa */
					var locale_upper_case = name.match(/[QWERTYUIOPASDFGHJKLZXCVBNMƯỨỮỬỰAĂÂÁÀẢÃẠĂẮẰẶẴẲẤẦẨẪẬĐÊẾỀỂỄỆÍÌỈĨỊÝỲỶỸỴ]/g);
					if (locale_upper_case && locale_upper_case.length > 2) type = 'name_many_upper';else return true;
				}
			}
		};
		return this.set('name', type);
	}
	gender(gender) {
		return gender === 'male' || gender === 'female' || this.set('gender', 'error_gender');
	}
	day(day) {
		return this.int(day) && day > 0 && day < 32;
	}
	month(month) {
		return this.int(month) && month > 0 && month < 13;
	}
	year(year) {
		return this.int(year) && year > 1900 && year < 2017;
	}
	birthday(d, m, y) {
		if (this.day(d) && this.month(m) && this.year(y)) {
			return ((d === 30 || d === 31) && m === 2) ? this.set('birthday', 'birthday_leap_year') : true;
		}else{
			return this.set('birthday', 'error_birthday');
		}
	}
	code(a) {
		return (/^[0-9]{6}$/g.test(a) || this.set('code', 'error_code')
		);
	}
	pass(a) {
		return (/(.){8,100}/g.test(a) || this.set('pass', 'invalid_pass')
		);
	}
	email(email) {
		var array = email.split('@');
		if(array.length === 2){
			if(/[a-zA-Z0-9_\.\-]+/.test(array[0]) && /(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+/.test(array[1])){
				return true;
			}
		}
		return this.set('email', 'error_email');
	}
	phone(phone) {
		if((phone[0] === '0' || phone[0] === '+') && /^[0-9]{9,15}$/.test(phone)) return true;
		else return this.set('phone', 'error_phone');
	}
	username(a) {
		if(ListUserNameFound.indexOf(a) < 0 && /^[a-zA-Z0-9\.]{2,40}$/.test(a)) return true;
		else return this.set('username', 'error_username');
	}
	url(a) {
		var urlRegex = /(http|https|ftp)\:\/\/([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(\/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*/g;
		var url = urlRegex.exec(a);
		return url ? url[0] : false;
	}
	int(number) {
		return number === parseFloat(number);
	}
}
},{"./trim":21}],17:[function(require,module,exports){
var Cookie = {
	define: '',
	data: {},
	start: function(cookie_string){
		// cookie_string: 'user=1; time=6f9a14702a2c0df24d9d7d323e16308dddabd42e';
		if (cookie_string) {
			var list_cookie = cookie_string.split('; ');
			for (var i = 0, n = list_cookie.length; i < n; i++) {
				var c = list_cookie[i].split('=');
				this.data[this.decode(c[0])] = this.decode(c[1]);
			}
		}
	},
	encode: function(i) {
		return encodeURIComponent(i);
	},
	decode: function(i) {
		return decodeURIComponent(i);
	},
	init: function(set) {
		var date = new Date(),
		    time = set.day || 1,
		    path = set.path || '/';
		date.setTime(date.getTime() + time * 24 * 3600000);

		var array = ['expires=' + date.toUTCString(), 'path=' + path];
		if (set.host) array.push('domain=' + set.host);
		if (set.secure) array.push('secure=' + set.secure);

		this.define = array.join(';');
		return this;
	},
	set: function(array) {
		for (var i in array) {
			var key = this.decode(i),
			    value = this.decode(array[i]);
			document.cookie = key + '=' + value + ';' + this.define;
			this.data[key] = value;
		}
	},
	has: function(name) {
		return this.data.hasOwnProperty(name);
	},
	get: function(name) {
		return this.data[name];
	},
	remove: function(...array) {
		if (!this.define) this.init({ day: -365, path: '/' });

		for (var i = 0, n = array.length; i < n; i++) {
			document.cookie = this.decode(array[i]) + '=;' + this.define;
			delete this.data[this.decode(array[i])];
		}
	},
	removeAll: function() {
		for (var i in this.data) {
			document.cookie = i + '=;' + this.define;
		}

		this.data = {};
	}
};

Cookie.start(document.cookie);

module.exports = Cookie;
},{}],18:[function(require,module,exports){
module.exports = class Event {
	constructor() {
		this._event = {};
	}

	on(name, fn) {
		this._event.hasOwnProperty(name) ? this._event[name].push(fn) : this._event[name] = [fn];
	}

	emit(name, ...value) {
		var list = this._event[name] || [];

		for (var i = 0, n = list.length; i < n; i++) {
			list[i].apply(null, value);
		}
	}

	setState(list) {
		for (var i in list) {
			this.emit(i, list[i]);
		}
	}

	removeListener(name) {
		if (name) delete this._event[name]; else this._event = {};
	}

	removeAllListeners(){
		this._event = {};
	}
}
},{}],19:[function(require,module,exports){
var Check = require('./check'), is = module.exports = new Check();
},{"./check":16}],20:[function(require,module,exports){
/**
 *  WebSocket For Browser
 *
 *  var socket = new WS(uri, { headers: {token: '', cookie: '', ...} })
 */

class WS {
  constructor(uri) {
    this._event = {};
    this._wait = [];

    this.socket = new window.WebSocket(uri);
    this.init();
  }

  get readyState() {
    return this.socket.readyState;
  }
  get connecting() {
    return WebSocket.CONNECTING === this.readyState;
  }
  get connected() {
    return WebSocket.OPEN === this.readyState;
  }
  get disconnecting() {
    return WebSocket.CLOSING === this.readyState;
  }
  get disconnected() {
    return WebSocket.CLOSED === this.readyState;
  }

  init(socket) {
    var self = this,
        socket = this.socket;

    socket.onmessage = function (e) {
      if (self.connected) {
        var array = JSON.parse(e.data), event = self._event, fn;
        array.forEach(function(data){
          if(fn = event[data[0]]){
            fn.apply(null, data[1])
          }
        })
      }
    }
  }

  on(name, fn) {
    if(WS.ListEventDefault[name]){
      this.socket.addEventListener(name, fn);
    }else{
      this._event[name] = fn;
    }
  }

  emit(name, ...value) {
    if (this.disconnecting || this.disconnected) return;

    var fn = value[value.length - 1],
        data = [name, value];

    if ('function' === typeof fn) {
      this.on(name, fn);
      data[1].pop();
      data[2] = 1;
    }

    this.connecting ? this.wait(data) : this.send([data]);
  }

  wait(data) {
    this._wait.push(data);

    if (!this.waiting) {
      var self = this;

      this.waiting = setInterval(function () {

        switch (self.readyState) {

          case 1:
            self.send(self._wait);
            self.stop_wait();
            return;

          case 2:
          case 3:
            if (self.waiting) self.stop_wait();
            return;

        }
      }, 1000);
    }
  }

  stop_wait() {
    clearInterval(this.waiting);
    delete this.waiting;
    this._wait = [];
  }

  /**
   *  array: [ [event_name, event_data] ]
   *
   *  => socket.emit(event_name, ...event_data);
   */

  send(array) {
    this.socket.send(JSON.stringify(array));
  }
}

WS.ListEventDefault = {open: 1, close: 1, error: 1};

module.exports = WS;
},{}],21:[function(require,module,exports){
module.exports = function trim(str) {
	return str.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, " ");
}
},{}]},{},[1])