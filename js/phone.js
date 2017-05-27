(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var { app, socket } = require('kem/dom');
var Model = require('./index');

module.exports = class Comment extends Model {
	constructor(post) {
		super({
			user: app.me.id,
			parent: post.id,
			like: []
		});
	}

	set like(n) {
		this.data.like = [];
	}

	get done() {
		if (this.is.error) return;
		return this.data.text || this.data.link || this.data.file;
	}

	insert(fn) {
		if (this.done) {
			this.data.time = Date.now();
			socket.emit(this.event_insert, 'post', this.data);
			fn();
			this.reset();
		}
	}
};
},{"./index":2,"kem/dom":46}],2:[function(require,module,exports){
var { Check, app, socket } = require('kem/dom');

var reg_url = /(https?:\/\/[^\s]+)/;

function getTag(txt) {
	var r = txt.match(/#[a-z0-9\-\_]+/gi);
	if (r) return r.map(function (w) {
		return w.replace('#', '').toLocaleLowerCase();
	});
}
function getUrl(txt) {
	var r = reg_url.exec(txt);
	if (r) return r[0];
}

module.exports = class Model {
	constructor(data) {
		this.data = {
			count: {
				comment: 0,

				like: 0,
				love: 0,
				wow: 0,
				haha: 0,
				angry: 0,
				sad: 0,

				report: 0
			}
		};

		this.uploading = 0;
		this.uploaded = 0;
		this.is = new Check();
		this._name = this.constructor.name.toLocaleLowerCase();

		Object.assign(this, data || {});

		this.$data = this.clone(this.data);
	}

	set parent(id) {
		if (this.is.id(id)) this.data.parent = id;
	}
	set user(id) {
		if (this.is.id(id)) this.data.user = id;
	}
	set type(type) {
		this.data.type = type;
	}
	set text(text) {
		var txt = text.clean();

		if (txt) {
			this.data.text = txt;

			// get tags list
			this.data.keyword = getTag(txt);

			// get link
			this.data.link = getUrl(txt);

			// get title
			if (this.setTitle) this.data.title = /[^\n\.!\?]+/.exec(txt)[0];
		}
	}
	set file(file) {
		if (this.is.object(file)) this.data.file = file;
	}
	set count(count) {
		if (this.is.object(count)) Object.assign(this.data.count, count);
	}

	get event_insert() {
		return this._name;
	}
	get event_like() {
		return this._name + ':like';
	}
	get tmp_id() {
		return app.me.id + ':' + this.data.time;
	}

	clone(data) {
		return Object.assign({}, data);
	}
	reset() {
		this.data = this.clone(this.$data);
	}
};
},{"kem/dom":46}],3:[function(require,module,exports){
var { local, cache, socket } = require('kem/dom');
var Model = require('./index.js');
var ListShareWith = { people: 'people', friend: 'friend', me: 'me' };

module.exports = class Post extends Model {
	constructor() {
		super({
			type: 'text',
			count: {
				share: 0,
				view: 0
			}
		});
		this.data.user = [];
		this.data.people = [];
		this.data.files = [];

		this.user_feed = [];
		this.users = [];
	}

	/**
  *	Set User
  */
	set user(object) {
		this.data.user.push(object);
	}

	/**
  *	Set User
  */
	set people(id) {
		this.data.people.push(id);
	}

	/**
  *	Set Main
  */
	main(bool) {
		if (bool) this.data.main = 1;
	}

	/**
  *	Set Read
  *	Value: people, friend, me
  */
	set read(value) {
		this.data.read = ListShareWith[value] || 'people';
	}

	/**
  *	Set Type
  *	Value: text, image, video, audio
  */
	set type(type) {
		switch (type) {
			case 'video':
			case 'audio':
				this.data.type = type;
				this.reg = /^(audio|video)$/;
				return;
			case 'image':
				this.data.type = 'image';
				this.reg = /^image$/;
				return;
			case 'text':
				this.data.type = type;
				return;
		}
	}

	/**
  *	Set User
  */
	set friend(friend) {
		if (friend && friend.length) {
			for (var i = 0, n = friend.length; i < n; i++) {
				this.user = { id: friend[i].id, type: 'with' };
				this.people = friend[i].id;
			}

			this.users = friend;
		}
	}
	set origin(id) {
		this.user = { id, type: 'origin' };
		this.people = id;
		this._origin = { id, type: 'origin' };
	}
	set target(id) {
		this.user = { id, type: 'target' };
		this.people = id;
	}
	set remind(user) {
		this.user = { id: user.id, type: 'remind', name: user.name };
	}

	get origin() {
		return this._origin;
	}

	/**
  *	Check for finish
  */
	get done() {
		if (this.uploading !== this.uploaded) return false;
		return this.data.text || this.data.link || this.data.feel || this.data.files.length;
	}

	/**
  *	Check type
  */
	get type() {
		return this.data.type;
	}
	test(type) {
		return this.reg.test(type);
	}

	/**
  *	File: {name, poster(if video), lyric(if audio)}
  */
	set file(file) {
		this.data.files.push(file);
	}

	/**
  *	Insert Action
  */
	insert(fn) {
		if (this.done) {
			this.main = 1;
			this.read = local.get('share_with');
			this.friend = cache.get('post:friend');
			this.data.time = Date.now();

			socket.emit('post', 'post', this.data, (error, data) => {
				fn();

				if (error) return;

				this.users.unshift(app.me);
				data.people = this.users;
				data.like = null;

				app.emit('post:new', data);
			});

			setTimeout(function () {
				cache.del('post:friend');
			});
		}
	}
};
},{"./index.js":2,"kem/dom":46}],4:[function(require,module,exports){
var { app, socket } = require('kem/dom');

var Model = require('./index');
var User = require('./user');

module.exports = class Comment extends Model {

	get parent() {
		return this.data.parent;
	}
	get user() {
		return this.pending ? this.data.user : new User(this.data.user);
	}
	get file() {
		return this.data.file;
	}

	get state() {
		return {
			countVote: this.vote,
			countComment: this.data.count.reply,
			like: this.data.like ? this.data.like.name : ''
		};
	}
};
},{"./index":5,"./user":7,"kem/dom":46}],5:[function(require,module,exports){
var { app, socket } = require('kem/dom');
var Time = require('kem/lib/time');

module.exports = class Model {
	constructor(data) {
		this._name = this.constructor.name.toLowerCase();
		this.data = data || {};
		this.wait = {};
		this.click = { like: 0, comment: 0 };

		this.query_comment = {
			user: app.me.id,
			parent: this.id,
			limit: app.get('limit') || 10
		};
	}

	get id() {
		return this.data._id || this.data.id;
	}
	get text() {
		return this.data.text;
	}
	get vote() {
		var count = this.data.count;
		return count.like + count.love + count.wow + count.haha + count.sad + count.ungry;
	}
	get pending() {
		return this.data.pending;
	}

	set sub(name) {
		--this.data.count[name];
	}
	set plus(name) {
		++this.data.count[name];
	}

	set like(data) {
		this.data.like = data;
	}

	time(fn) {
		var time = this.data.time,
		    now;

		function callback() {
			now = Time.timeago(time);
			fn(now.text);

			if (now.timeout) setTimeout(callback, now.timeout);
		};

		callback();
	}

	remove(fn) {
		var data = { id: this.id, user: app.me.id },
		    next = 0;

		switch (this._name) {
			case 'post':
				var index = this.data.user.findIndex(function (u) {
					return u.id === data.user && u.type !== 'remind';
				});
				if (index === -1) return fn();

				data.read = this.data.user[index].type;
				next = 1;

				break;
			case 'comment':
				if (data.user === this.user.id) next = 1;
				break;
		}

		next ? socket.emit(this._name, 'delete', data) : fn();
	}

	click_like(name) {
		if (this.wait.like) return;
		if (++this.click.like > 2) return;

		if (this.data.like) {
			if (this.data.like.name === name) {
				this.data.like.action = 'delete';
			} else {
				this.data.like.action = 'put';
				this.data.like.from = this.data.like.name;
				this.data.like.name = name;
			}
			if (!this.data.like.of) this.data.like.of = this.id;
		} else {
			this.data.like = {
				action: 'post',
				user: app.me.id,
				name: name,
				of: this.id,
				time: Date.now()
			};
		}

		socket.emit(this._name + ':like', this.data.like);

		this.wait.like = 1;
	}

	click_comment(time, fn) {
		// if(this.data.count.comment === 0) return fn([]);

		this.query_comment.from = time;
		this.load_comment(fn);
	}

	load_comment(fn) {
		if (this.wait.comment) return;

		this.wait.comment = 1;

		socket.emit('comment', 'get', this.query_comment, (error, array) => {
			fn(array);
			this.wait.comment = 0;
		});
	}
};
},{"kem/dom":46,"kem/lib/time":66}],6:[function(require,module,exports){
var { socket, app } = require('kem/dom');
var Model = require('./index');
var User = require('./user');

module.exports = class Post extends Model {
	constructor(data) {
		super(data);
		this.user_data = { 'with': [] };
		this.parse_user(this.data.user, this.data.people);
	}

	parse_user(user, people) {
		var user_data = {};

		for (var i = 0, n = people.length; i < n; i++) {
			user_data[people[i].id] = new User(people[i]);
		}

		for (var i = 0, n = user.length; i < n; i++) {
			var u = user[i];
			switch (u.type) {
				case 'origin':
				case 'target':
					this.user_data[u.type] = user_data[u.id];
					break;
				case 'with':
					this.user_data.with.push(user_data[u.id]);
					break;
			}
		}
	}
	get origin() {
		return this.user_data.origin;
	}
	get target() {
		return this.user_data.target;
	}
	get friend() {
		return this.user_data.with;
	}

	get files() {
		return this.data.files;
	}

	/**
  *	Post DOM state
  */
	get state() {
		var count = this.data.count;
		return {
			// countLike: count.like,
			// countLove: count.love,
			// countWow: count.wow,
			// countHaha: count.haha,
			// countSad: count.sad,
			// countUngry: count.ungry,
			countComment: count.comment,
			countShare: count.share,
			countView: count.view,
			countVote: this.vote,
			like: this.data.like ? this.data.like.name : ''
		};
	}
};
},{"./index":5,"./user":7,"kem/dom":46}],7:[function(require,module,exports){
var { app, session, socket } = require('kem/dom');
var Model = require('./index.js');

module.exports = class User {
	constructor(data) {
		this.data = data;
		this.wait = {};
	}
	get id() {
		return this.data.id;
	}
	get fname() {
		return this.data.fname;
	}
	get lname() {
		return this.data.lname;
	}
	get username() {
		return this.data.username;
	}
	get avatar() {
		return `http://localhost:9000/asset/file/${this.data.avatar}/p40x40`;
	}
	get gender() {
		return this.data.gender;
	}
	get name() {
		return this.data.name;
	}
	get url() {
		if (!this.data.url) this.data.url = this.username ? `/${this.username}` : `/u/${this.id}`;
		return this.data.url;
	}
	get not() {
		return this.data.not;
	}
	get user_data() {
		return { id: this.id, name: this.name, avatar: this.avatar };
	}

	get isfriend() {
		return this.data.friend.friend;
	}
	get requesting() {
		var request = this.data.friend.request;
		if (request) {
			switch (request.from) {
				case this.id:
					return 'friend_request';
				case app.me.id:
					return 'friend_response';
			}
		}
		return '';
	}
	get following() {
		var me = app.me.id;
		return this.data.friend.follow.findIndex(function (u) {
			return me === u.from;
		}) !== -1;
	}

	friend_action(action, fn) {
		if (this.wait[action]) return fn ? fn() : 0;
		socket.emit('friend', action, app.me.id, this.id, fn);
	}
	request(fn) {
		this.friend_action('request', fn);
	}
	response() {
		this.friend_action('response');
	}
	unfriend() {
		this.friend_action('unfriend');
	}
	follow() {
		this.friend_action('follow');
	}
	block() {
		this.friend_action('block');
	}

	hovercard(fn) {
		if (session.has(this.id)) return fn(session.get(this.id).array());
		socket.emit('user', 'hovercard', this.id, data => {
			fn(data);
			session.set(this.id, data.json());
		});
	}
};
},{"./index.js":5,"kem/dom":46}],8:[function(require,module,exports){
var { DOM, Link, cookie } = require('kem/dom');

module.exports = class AccountController extends DOM {

	constructor(props) {
		super(props);
		this.state = { header: '', section: null };
	}

	__setState(title, header) {
		document.title = lang[title];
		this.emit('header', header);
	}

	index() {
		this.__setState('title_account', 'Website');
		return require('./view/login');
	}

	register() {
		this.__setState('title_register', lang.header_register);
		return require('./view/register');
	}

	login() {
		this.__setState('title_login', lang.header_login);
		return require('./view/login');
	}

	recover() {
		this.__setState('title_recover', lang.header_recover);
		return require('./view/recover');
	}

	confirm() {
		this.__setState('title_confirm', lang.header_confirm);
		return require('./view/confirm');
	}

	logout() {
		cookie.remove('user', 'time');
		window.history.replaceState(null, null, '/');
		return this.index();
	}

	render() {
		return DOM.x(
			'div',
			{ className: 'container-fluid', id: 'account' },
			DOM.x(
				'header',
				{ className: 'row' },
				DOM.x(
					'div',
					{ className: 'text-center' },
					this.state.header
				)
			),
			DOM.x(
				'section',
				null,
				this.state.section
			),
			DOM.x(
				'footer',
				{ className: 'row' },
				DOM.x(
					'div',
					{ className: 'clearfix', style: 'padding: 20px;' },
					DOM.x(
						'div',
						{ className: 'pull-left', style: 'width: 33%' },
						DOM.x(
							Link,
							{ to: '/' },
							'Home'
						)
					),
					DOM.x(
						'div',
						{ className: 'pull-left text-center', style: 'width: 33%' },
						DOM.x(
							Link,
							{ to: '/setting/lang' },
							lang.lang_name
						)
					),
					DOM.x(
						'div',
						{ className: 'pull-right' },
						DOM.x(
							Link,
							{ to: '/help' },
							'Help'
						)
					)
				)
			)
		);
	}
};
},{"./view/confirm":9,"./view/login":10,"./view/recover":11,"./view/register":12,"kem/dom":46}],9:[function(require,module,exports){
var { DOM, is, cookie, ws, app } = require('kem/dom');

module.exports = class Confirm extends DOM {
	constructor(props) {
		super(props);
		this.state = { error: '', button: false };
	}
	submit() {
		var form = this.dom,
		    data = { phone: cookie.get('confirm') || form.phone.value, code: form.code.value };

		if (!is.phone(data.phone)) {
			this.emit('error', lang[is.get('phone')]);
			return form.phone ? form.phone.focus() : false;
		}
		if (!is.code(data.code)) {
			this.emit('error', lang[is.get('code')]);
			return form.code.focus();
		}

		ws.emit('account', 'confirm', data, (error, user, time, token) => {
			if (error) return this.setState({ error: lang[user], button: false });

			app.emit('set-cookie', user, time, token);
			cookie.remove('confirm');
		});

		this.setState({ error: '', button: true });
	}
	render() {
		return DOM.x(
			'form',
			{ className: 'account' },
			DOM.x(
				'div',
				{ className: 'error' },
				this.state.error
			),
			DOM.x(
				'div',
				{ className: 'input-group' },
				cookie.has('confirm') ? null : DOM.x('input', { type: 'text', name: 'phone', className: 'form-control', placeholder: lang.input_phone }),
				DOM.x('input', { type: 'text', name: 'code', className: 'form-control', placeholder: lang.input_code })
			),
			DOM.x(
				'button',
				{ type: 'button',
					className: 'btn btn-primary btn-sm account-btn',
					onmousedown: this.submit.bind(this),
					disabled: this.state.button },
				lang.confirm
			)
		);
	}
};
},{"kem/dom":46}],10:[function(require,module,exports){
var { DOM, Link, is, cookie, local, ws, app } = require('kem/dom');

module.exports = class Login extends DOM {
	constructor() {
		super();
		this.state = { error: '', button: false };
		this.data = {};
	}
	submit() {
		if (!this.form) this.form = this.find('form');

		var data = { phone: this.form.phone.value, pass: this.form.pass.value };

		if (this.data.phone === data.phone && this.data.pass === data.pass) return;

		this.data = data;
		data.type = is.phone(data.phone) ? 'phone' : is.username(data.phone) ? 'username' : null;

		if (data.type === null) {
			this.emit('error', lang.error_login);
			this.form.phone.focus();
			return;
		}

		if (!is.pass(data.pass)) {
			this.emit('error', lang[is.get('pass')]);
			this.form.pass.focus();
			return;
		}

		ws.emit('account', 'login', data, (error, user, time, token) => {
			if (error) {
				if ('account_not_confirm' === user) {
					cookie.init({ day: 3 }).set({ confirm: data.phone });
					Link.to('/account/confirm');
				} else {
					this.setState({ error: lang[user], button: false });
				}
			} else {
				app.emit('set-cookie', user, time, token);
			}
		});

		this.setState({ error: '', button: true });
	}
	render() {
		return DOM.x(
			'div',
			null,
			DOM.x(
				'form',
				{ className: 'account' },
				DOM.x(
					'div',
					{ className: 'error' },
					this.state.error
				),
				DOM.x(
					'div',
					{ className: 'input-group' },
					DOM.x('input', { type: 'text', name: 'phone', className: 'form-control', placeholder: lang.input_phone }),
					DOM.x('input', { type: 'password', name: 'pass', className: 'form-control', placeholder: lang.input_pass })
				),
				DOM.x(
					'div',
					{ className: 'input-group clearfix', style: { border: 'none' } },
					DOM.x(
						'button',
						{
							type: 'button',
							className: 'btn btn-primary btn-sm account-btn pull-right',
							onmousedown: this.submit.bind(this),
							disabled: this.state.button },
						lang.login
					)
				)
			),
			DOM.x(
				'div',
				{ className: 'text-center' },
				DOM.x(
					'div',
					null,
					DOM.x(
						Link,
						{
							to: '/account/register',
							className: 'btn btn-md btn-default',
							style: { backgroundColor: "#3c763d", color: "#FFFFFF", width: "60%" } },
						lang.link_register
					)
				),
				DOM.x(
					'div',
					{ style: 'margin-top: 10px; font-size: 13px;' },
					DOM.x(
						Link,
						{ to: '/account/recover', style: 'font-size: medium' },
						lang.link_recover_pass
					)
				)
			)
		);
	}
};
},{"kem/dom":46}],11:[function(require,module,exports){
var { DOM, Link, is, cookie, cache, ws } = require('kem/dom');

module.exports = class Recover extends DOM {
	constructor(props) {
		super(props);
		this.state = { error: '', button: false };
	}
	submit() {
		if (!this.form) this.form = this.find('form');
		var data = { phone: this.form.phone.value };

		if (is.phone(data.phone)) {
			this.setState({ button: true, error: '' });

			ws.emit('account', 'recover', data, (error, message) => {
				if (error) return this.setState({ error: lang[message], button: false });
				// show option send message to get code to reset password
			});
		} else {
			this.setState({ error: lang.error_phone, button: false });
			this.form.phone.focus();
		}
	}
	render() {
		return DOM.x(
			'div',
			null,
			DOM.x(
				'form',
				{ className: 'account' },
				DOM.x(
					'div',
					{ className: 'error' },
					this.state.error
				),
				DOM.x(
					'div',
					{ className: 'input-group' },
					DOM.x('input', { name: 'phone', className: 'form-control', placeholder: lang.input_phone, maxLength: '100' })
				),
				DOM.x(
					'button',
					{ type: 'button',
						disabled: this.state.button,
						onmousedown: this.submit.bind(this),
						className: 'btn btn-primary btn-sm account-btn' },
					lang.send
				)
			),
			DOM.x(
				'div',
				{ style: 'margin: 4px 10px' },
				lang.if_have_code,
				' ',
				DOM.x(
					Link,
					{ to: '/account/confirmresetpass', style: 'text-transform: lowercase;' },
					lang.confirm
				),
				' ',
				lang.and,
				' ',
				DOM.x(
					Link,
					{ to: '/account/confirmresetpass' },
					lang.reset_pass
				),
				'.'
			)
		);
	}
};
},{"kem/dom":46}],12:[function(require,module,exports){
var { DOM, Link, Check, cookie, ws } = require('kem/dom');

module.exports = class Register extends DOM {
	constructor(props) {
		super(props);

		this.state = { name: '', phone: '', gender: '', birthday: '', pass: '', button: false };
		this.data = {};
	}
	clickGender() {
		this.childNodes[0].click();
	}

	set fname(name) {
		this.data.fname = name;
		this.emit('name', this.is.name(name) ? '' : lang[this.is.get('name')]);
	}
	set lname(name) {
		this.data.lname = name;
		this.emit('name', this.is.name(name) ? '' : lang[this.is.get('name')]);
	}
	set phone(phone) {
		this.data.phone = phone;
		this.emit('phone', this.is.phone(phone) ? '' : lang[this.is.get('phone')]);
	}
	set gender(gender) {
		this.data.gender = gender;
		this.emit('gender', this.is.gender(gender) ? '' : lang[this.is.get('gender')]);
	}
	set pass(pass) {
		this.data.pass = pass;
		this.emit('pass', this.is.pass(pass) ? '' : lang[this.is.get('pass')]);
	}

	birthday(day, month, year) {
		this.data.day = Number(day);
		this.data.year = Number(year);
		this.data.month = Number(month);
		this.emit('birthday', this.is.birthday(this.data.day, this.data.month, this.data.year) ? '' : lang[this.is.get('birthday')]);
	}
	submit(e) {
		if (!this.form) this.form = this.find('form');
		this.is = new Check();

		var form = this.form;

		this.fname = form.fname.value;
		this.lname = form.lname.value;
		this.phone = form.phone.value;
		this.gender = form.gender.value;
		this.birthday(form.day.value, form.month.value, form.year.value);
		this.pass = form.pass.value;

		if (this.is.error) return;

		ws.emit('account', 'register', this.data, (error, message) => {
			if (error) {
				for (var i in message) {
					this.emit(i, lang[message[i]]);
				}
				this.emit('button', false);
			} else {
				cookie.init({ day: 3 }).set({ confirm: this.data.phone });
				Link.to("/account/confirm");
			}
		});
	}
	render() {
		return DOM.x(
			'div',
			null,
			DOM.x(
				'form',
				{ className: 'account', id: 'register' },
				DOM.x(
					'div',
					{ className: 'form-group' },
					DOM.x('input', { name: 'fname', className: 'form-control', placeholder: lang.input_fname, maxLength: '50' }),
					DOM.x('input', { name: 'lname', className: 'form-control', placeholder: lang.input_lname, maxLength: '50' }),
					DOM.x(
						'div',
						{ className: 'error' },
						this.state.name
					)
				),
				DOM.x(
					'div',
					{ className: 'form-group' },
					DOM.x('input', { name: 'phone', className: 'form-control', placeholder: lang.input_phone, maxLength: '120' }),
					DOM.x(
						'div',
						{ className: 'error' },
						this.state.phone
					)
				),
				DOM.x(
					'div',
					{ className: 'form-group' },
					DOM.x(
						'div',
						{ style: 'display: inline-block; margin-right: 22px' },
						lang.gender
					),
					DOM.x(
						'span',
						{ name: 'gender', onclick: this.clickGender, className: 'account-gender' },
						DOM.x('input', { type: 'radio', name: 'gender', value: 'male' }),
						DOM.x(
							'span',
							null,
							lang.male
						)
					),
					DOM.x(
						'span',
						{ name: 'gender', onclick: this.clickGender, className: 'account-gender' },
						DOM.x('input', { type: 'radio', name: 'gender', value: 'female' }),
						DOM.x(
							'span',
							null,
							lang.female
						)
					),
					DOM.x(
						'div',
						{ className: 'error', style: 'margin-top: 3px' },
						this.state.gender
					)
				),
				DOM.x(
					'div',
					{ id: 'birthday' },
					DOM.x(
						'div',
						null,
						lang.birthday
					),
					DOM.x(
						'div',
						null,
						DOM.x(
							'span',
							null,
							DOM.x('input', { name: 'day', placeholder: lang.input_day })
						),
						DOM.x(
							'span',
							null,
							'/'
						),
						DOM.x(
							'span',
							null,
							DOM.x('input', { name: 'month', placeholder: lang.input_month })
						),
						DOM.x(
							'span',
							null,
							'/'
						),
						DOM.x(
							'span',
							null,
							DOM.x('input', { name: 'year', placeholder: lang.input_year })
						)
					),
					DOM.x(
						'div',
						{ className: 'error' },
						this.state.birthday
					)
				),
				DOM.x(
					'div',
					{ className: 'form-group' },
					DOM.x('input', { type: 'text', name: 'pass', className: 'form-control', placeholder: lang.input_pass }),
					DOM.x(
						'div',
						{ className: 'error' },
						this.state.pass
					)
				),
				DOM.x('div', { className: 'account-footer font-sm' }),
				DOM.x(
					'button',
					{
						type: 'button',
						className: 'btn btn-primary account-btn',
						onmousedown: this.submit.bind(this),
						disabled: this.state.button },
					lang.register
				)
			),
			DOM.x(
				'div',
				{ style: 'padding: 0px 8px; font-size: 15px;' },
				DOM.x(
					Link,
					{ to: '/account/login' },
					lang.question_have_account,
					'?'
				)
			)
		);
	}
};
},{"kem/dom":46}],13:[function(require,module,exports){
var { DOM } = require('kem/dom');
var ReplyBox = require('../reply/box');
var ReplyList = require('../reply/list');

module.exports = class CommentBox extends ReplyBox {
	show_reply() {
		if (!this.data.click.show_reply) {

			this.data.click.show_reply = 1;

			var comment = this.data,
			    dom = this.dom.find('.comment-main');

			this.data.click_comment(Date.now(), array => {
				dom.append(DOM.x(ReplyList, { data: { id: comment.id, user: comment.user.id }, list: array.sort((a, b) => a.time > b.time) }));
			});
		}
	}
	get link_reply() {
		return DOM.x(
			'div',
			{ className: 'pull-left comment-link' },
			DOM.x(
				'a',
				{ onclick: this.show_reply.bind(this) },
				'Reply'
			)
		);
	}
};
},{"../reply/box":25,"../reply/list":29,"kem/dom":46}],14:[function(require,module,exports){
var { DOM, Modal, app } = require('kem/dom');
var CommentBox = require('./box');
var CommentForm = require('../reply/form');

var height = app.get('height') - 101;
// var height = app.get('height') - (42 + 4 + 3) - (44 + 8);

module.exports = class CommentList extends Modal {
	constructor(props) {
		super(props);
		this.state = { comment: props.list };
	}
	header() {
		return 'Anh tren dong thoi gian';
	}
	section() {

		return DOM.x(
			'ul',
			{ className: 'list-comment', style: `height: ${height}px;` },
			this.state.comment.unshift(function (comment) {
				return DOM.x(CommentBox, { data: comment });
			})
		);
	}
	footer() {
		return DOM.x(CommentForm, { data: this.props.data });
	}

	componentWillMount() {
		app.on('reply:' + this.props.data.id, comment => {
			this.emit('comment', comment);
		});
	}
};
},{"../reply/form":27,"./box":13,"kem/dom":46}],15:[function(require,module,exports){
require('kem/dom/prototype');
require('../socket/index');
require('../socket/account');

var { app } = require('kem/dom');
var hasLogin = require('../use/has-login');
var authenticate = require('../use/authenticate');

app.set({
	device: 'phone',
	limit: 5,
	asset: 'http://localhost:9000/asset/file/',
	height: window.innerHeight,
	width: window.innerWidth
});
app.fn = {
	image: function (id, option) {
		option = Object.assign({ w: null, w: null, q: 100, t: 'aspectfit' }, option || {});
		var url = ['http://localhost:9000/asset/photo/', id, '?'],
		    arr = [];
		for (var i in option) {
			arr.push(i + '=' + option[i]);
		}
		url.push(arr.join('&'));
		return url.join('');
	},
	file: function (id) {
		return 'http://localhost:9000/asset/file/' + id;
	}
};

app.dom.style.height = window.innerHeight + 'px';

app.use('/', authenticate, hasLogin() ? require('./index') : require('./account'));
app.use('/account/([a-z]+)', require('./account'));
app.error(require('../use/error-page'));

app.use(authenticate);
// other routes

app.handle();
},{"../socket/account":37,"../socket/index":40,"../use/authenticate":43,"../use/error-page":44,"../use/has-login":45,"./account":8,"./index":17,"kem/dom":46,"kem/dom/prototype":58}],16:[function(require,module,exports){
var { DOM, Link } = require('kem/dom');
var PostBox = require('../post/box');

var User = require('../../model/user');

module.exports = class FeedBox extends DOM {

	get feed() {
		var feed = this.props.data.feed,
		    user = new User(feed.user);
		return DOM.x(
			'div',
			null,
			DOM.x(
				Link,
				{ to: user.url },
				user.name
			)
		);
	}

	render() {
		return DOM.x(
			'div',
			{ className: 'feed' },
			this.props.data.feed.type ? this.feed : null,
			DOM.x(PostBox, { data: this.props.data.post })
		);
	}
};
},{"../../model/user":7,"../post/box":19,"kem/dom":46}],17:[function(require,module,exports){
var { DOM, Link, app } = require('kem/dom');

module.exports = class IndexController extends DOM {

	constructor(props) {
		super(props);
		this.state = { section: null };
	}

	index() {
		document.title = lang.title_index;
		return require('./view');
	}

	post_search(e) {
		e.preventDefault();

		var key = e.target.q.value;

		console.log(key);
	}

	render() {
		return DOM.x(
			'div',
			{ className: 'container-fluid', id: 'index' },
			DOM.x(
				'header',
				{ className: 'row', id: 'header' },
				DOM.x(Link, { to: '/', className: 'glyphicon glyphicon-home' }),
				DOM.x(Link, { to: '/friend', className: 'glyphicon glyphicon-user' }),
				DOM.x(Link, { to: '/message', className: 'glyphicon glyphicon-envelope' }),
				DOM.x(Link, { to: '/notification', className: 'glyphicon glyphicon-globe' }),
				DOM.x(Link, { to: '/search', className: 'glyphicon glyphicon-search' }),
				DOM.x(Link, { to: '/menu', className: 'glyphicon glyphicon-menu-hamburger' })
			),
			this.state.section
		);
	}
};
},{"./view":18,"kem/dom":46}],18:[function(require,module,exports){
var { DOM, Link, socket, app } = require('kem/dom');
var FeedBox = require('./feed');
var PostBox = require('../post/box');
var PostForm = require('../post/form');

module.exports = class Index extends DOM {
	constructor(props) {
		super(props);
		this.state = { feed: [], post: [], link: null };
	}
	componentWillMount() {
		// render list feed
		socket.on('feed:get', array => {
			this.emit('feed', this.state.feed.concat(array));
		});
		// render new post
		app.on('post:new', post => {
			console.log('post: ', post);
			this.emit('post', post);
		});
	}
	post_image() {}
	render() {
		return DOM.x(
			'section',
			{ className: 'row' },
			DOM.x(
				'div',
				{ className: 'clearfix', id: 'form_post_index' },
				DOM.x(
					'div',
					{ className: 'form-text relative' },
					DOM.x(Link, { to: app.me.url, style: `background-image: url(${app.me.avatar})` }),
					DOM.x(
						Link,
						{ modal: PostForm, className: 'input-text' },
						lang.what_do_you_mind
					),
					DOM.x('a', { onmousedown: this.post_image, className: 'glyphicon glyphicon-picture' }),
					DOM.x(Link, { className: 'glyphicon glyphicon-facetime-video' })
				)
			),
			DOM.x(
				'div',
				{ id: 'list_post' },
				this.state.post.unshift(function (post) {
					return DOM.x(PostBox, { data: post });
				}),
				this.state.feed.push(function (feed) {
					return DOM.x(FeedBox, { data: feed });
				})
			)
		);
	}
};
},{"../post/box":19,"../post/form":23,"./feed":16,"kem/dom":46}],19:[function(require,module,exports){
var { DOM, Link, app } = require('kem/dom');

var User = require('../../../model/user');
var Post = require('../../../model/post');

var CommentList = require('../../comment/list');
var PluginBox = require('../../../plugin/post-comment');

var PostMedia = require('./media');

module.exports = class PostBox extends PluginBox {
	constructor(props) {
		super();
		this.data = new Post(props.data);
		this.state = this.data.state;
	}

	get friend() {
		var user = this.data.friend,
		    count = user.length;

		if (!count) return null;

		return DOM.x(
			'div',
			{ className: 'pull-left post-with' },
			lang.with,
			' ',
			DOM.x(
				Link,
				{ to: user[0].url, className: 'post-user-name' },
				user[0].name
			),
			count > 1 ? lang.and : null,
			count === 1 ? null : count === 2 ? DOM.x(
				Link,
				{ to: user[1].url, className: 'post-user-name' },
				user[1].name
			) : `${count - 1} ${lang.other}`
		);
	}

	get avatar() {
		var user = this.data.target || this.data.origin;
		return DOM.x(
			Link,
			{ to: user.url, className: 'img i40' },
			DOM.x('img', { src: user.avatar })
		);
	}

	get name() {
		var target = this.data.target,
		    origin = this.data.origin;

		return DOM.x(
			'div',
			{ className: 'post-user' },
			DOM.x(
				'div',
				{ className: 'clearfix' },
				target ? DOM.x(
					'div',
					{ className: 'pull-left' },
					DOM.x(
						Link,
						{ to: target.url, className: 'post-user-name' },
						target.name
					)
				) : null,
				target ? DOM.x(
					'div',
					{ className: 'pull-left' },
					' > '
				) : null,
				DOM.x(
					'div',
					{ className: 'pull-left' },
					DOM.x(
						Link,
						{ to: origin.url, className: 'post-user-name' },
						origin.name
					)
				),
				this.friend
			),
			DOM.x(
				'div',
				null,
				this.time
			)
		);
	}

	clickcomment() {
		this.data.click_comment(Date.now(), list => {
			Link.modal(CommentList, { list, data: { id: this.data.id, user: this.data.user } });
		});
	}

	get media() {
		if (!this.data.files) return null;

		var files = this.data.files.slice(0, 5),
		    count = files.length;

		return DOM.x(PostMedia, { data: files, count: count, rest: this.data.files.length - count, post: this.data });
	}

	render() {
		return DOM.x(
			'div',
			{ className: 'post' },
			DOM.x(
				'header',
				{ className: 'relative' },
				DOM.x(
					'div',
					{ className: 'clearfix' },
					DOM.x(
						'div',
						{ className: 'pull-left' },
						this.avatar
					),
					DOM.x(
						'div',
						{ className: 'pull-left' },
						this.name
					)
				),
				DOM.x('div', { className: 'absolute post-menu' })
			),
			DOM.x(
				'section',
				null,
				this.text,
				this.media
			),
			DOM.x(
				'footer',
				{ className: 'post-footer' },
				DOM.x(
					'div',
					{ className: 'link-time post-count clearfix' },
					this.state.countVote.update(function (count) {
						return DOM.x(
							'div',
							{ className: 'pull-left' },
							DOM.x('span', { className: 'glyphicon glyphicon-thumbs-up' }),
							DOM.x(
								'span',
								null,
								count
							)
						);
					}),
					this.state.countComment.update(function (count) {
						return DOM.x(
							'div',
							{ className: 'pull-left' },
							DOM.x('span', { className: 'glyphicon glyphicon-comment' }),
							DOM.x(
								'span',
								null,
								count
							)
						);
					}),
					this.state.countView.update(function (count) {
						return DOM.x(
							'div',
							{ className: 'pull-right' },
							DOM.x('span', { className: 'glyphicon glyphicon-share-alt' }),
							DOM.x(
								'span',
								null,
								count
							)
						);
					}),
					this.state.countShare.update(function (count) {
						return DOM.x(
							'div',
							{ className: 'pull-right' },
							DOM.x('span', { className: 'glyphicon glyphicon-share-alt' }),
							DOM.x(
								'span',
								null,
								count
							)
						);
					})
				),
				DOM.x(
					'div',
					{ className: 'clearfix post-btn' },
					DOM.x(
						'a',
						{ onmousedown: this.clicklike.bind(this), className: this.state.like },
						DOM.x('span', { className: 'glyphicon glyphicon-thumbs-up' }),
						DOM.x(
							'span',
							null,
							'Like'
						)
					),
					DOM.x(
						'a',
						{ onmousedown: this.clickcomment.bind(this) },
						DOM.x('span', { className: 'glyphicon glyphicon-comment' }),
						DOM.x(
							'span',
							null,
							'Comment'
						)
					),
					DOM.x(
						Link,
						null,
						DOM.x('span', { className: 'glyphicon glyphicon-share-alt' }),
						DOM.x(
							'span',
							null,
							'Share'
						)
					)
				)
			)
		);
	}
};
},{"../../../model/post":6,"../../../model/user":7,"../../../plugin/post-comment":34,"../../comment/list":14,"./media":20,"kem/dom":46}],20:[function(require,module,exports){
var { DOM, app } = require('kem/dom');
var Tag = require('./tag');
var className = { 'true': 'pm-lt', 'false': 'pm-gt', 'eq': 'pm-eq' };
var action = ['', 'one', 'two', 'three', 'four', 'five'];
var fixed_width = app.dom.clientWidth;

module.exports = class PostMediaParent extends DOM {
	get f() {
		return this.props.data[0];
	}
	get one() {
		var f = this.f;
		return [f.height / f.width < 1.5 ? fixed_width * f.height / f.width : fixed_width * 1.5];
	}
	get two() {
		var f1 = this.f,
		    f2 = this.props.data[1],
		    h = [fixed_width / 2];

		this.name = 'false';

		if (f1.width < f1.height && f2.width < f2.height) {
			/**	
    *	-------------------------		
    *	|			|			|
    *	|			|			|
    *	|			|			|
    *	|			|			|
    *	|			|			|
    *	-------------------------
    */
			this.name = 'true';
			h[0] *= f1.height > f2.height ? f1.height / f1.width : f2.height / f2.width;
		} else {
			if (!(f1.width < f1.height && f2.width < f2.height)) {
				/**	
     *	-------------------------	
     *	|			|			|
     *	|			|			|
     *	|			|			|
     *	|			|			|
     *	|			|			|
     *	-------------------------
     */
				this.name = 'true';
			}
		}

		/**
   *	-----------------			
   *	|				|
   *	|				|
   *	|				|
   *	|----------------
   *	|				|
   *	|				|
   *	|				|
   *	-----------------
   */

		h[1] = h[0];

		return h;
	}
	get three() {
		var f = this.f,
		    h = [],
		    r;

		if (f.width > f.height) {
			/*
    *	---------------------
    *	|					|
    *	|					|
    *	|					|	3/5
    *	|					|
    *	|					|
    *	---------------------
    *	|		  |  		|
    *	|		  |			|	2/5
    *	|		  |			|
    *	---------------------
    */
			h[0] = fixed_width * 3 / 5;
			h[1] = h[2] = fixed_width - h[0];
			r = 'false';
		} else {
			/**		 3/5	   2/5
    *	---------------------			
    *	|			|		|
    *	|			|		|
    *	|			|		|
    *	|			|--------
    *	|			|		|
    *	|			|		|
    *	|			|		|
    *	---------------------
    */
			h[0] = fixed_width;
			h[1] = h[2] = fixed_width / 2;
			r = 'true';
		}

		this.name = r;

		return h;
	}
	get four() {
		var f = this.f,
		    r = f.width < f.height,
		    h = [];

		if (r) {
			/**		 3/5	   2/5
    *	---------------------			
    *	|			|		|
    *	|			|		|
    *	|			---------
    *	|			|		|
    *	|			|		|
    *	|			---------
    *	|			|		|
    *	|			|		|
    *	---------------------
    */
			h[0] = fixed_width;
			h[1] = h[2] = h[3] = fixed_width / 3;
		} else if (f.width === f.height) {
			/*
    *	---------------------
    *	|		  |			|
    *	|		  |			|
    *	|		  |			|
    *	---------------------
    *	|		  |  		|
    *	|		  |			|
    *	|		  |			|
    *	---------------------
    */
			r = 'eq';
			h[0] = h[1] = h[2] = h[3] = fixed_width / 2;
		} else {
			/*
    *	-------------------------			
    *	|						|
    *	|						|
    *	|		   3/5			|
    *	|						|
    *	|						|
    *	-------------------------
    *	|		|		|		|
    *	|		|		|		|
    *	|		|		|		|
    *	-------------------------
    */
			h[0] = fixed_width * 3 / 5;
			h[1] = h[2] = h[3] = fixed_width - h[0];
		}

		this.name = r;

		return h;
	}
	get five() {
		var f = this.f,
		    r = f.width < f.height,
		    h = [];

		if (r) {
			/**		 3/5	   2/5
    *	---------------------			
    *	|			|		|
    *	|			|		|
    *	|			---------
    *	|			|		|
    *	|			|		|
    *	|			---------
    *	|			|		|
    *	|			|		|
    *	---------------------
    */
			h[0] = h[1] = fixed_width / 2;
			h[2] = h[3] = h[4] = fixed_width / 3;
		} else {
			/*
    *	-------------------------			
    *	|						|
    *	|						|
    *	|		   3/5			|
    *	|						|
    *	|						|
    *	-------------------------
    *	|		|		|		|
    *	|		|		|		|
    *	|		|		|		|
    *	-------------------------
    */
			h[0] = h[1] = fixed_width * 3 / 5;
			h[2] = h[3] = h[4] = fixed_width - h[0];
		}

		this.name = r;

		return h;
	}

	set name(n) {
		this.className = className[n];
	}
	get name() {
		return this.className || '';
	}
	render() {
		var files = this.props.data,
		    c = files.length,
		    h = this[action[c]];
		return DOM.x(
			'div',
			{ className: `post-media pm${c} ${this.name} clearfix` },
			files.map(function (f, i) {
				return DOM.x(Tag, { data: f, height: h[i] });
			})
		);
	}
};
},{"./tag":21,"kem/dom":46}],21:[function(require,module,exports){
var { DOM, app, Link } = require('kem/dom');

module.exports = class MediaTag extends DOM {
	get url() {
		return app.fn.file(this.props.data.name);
	}

	render() {
		var f = this.props.data,
		    h = this.props.height;
		var name = f.width < f.height ? 'pma-lt' : f.width === f.height ? 'pma-eq' : 'pma-gt';

		switch (f.type) {
			case 'image':
				return DOM.x(Link, { style: `background-image: url(${this.url}); height: ${h}px;`, className: name });
			case 'video':
				return DOM.x('video', { src: this.url });
			case 'audio':
				return DOM.x('audio', { src: this.url });
		}
	}
};
},{"kem/dom":46}],22:[function(require,module,exports){
var { DOM, cache, app } = require('kem/dom');
var FriendBox = require('../../../plugin/friend');

class Friend extends FriendBox {

	header() {
		return lang.add_friend;
	}

	next() {
		app.emit('post:friend', cache.get('post:friend'));
		this.emit('done');
	}
};

module.exports = Friend;
},{"../../../plugin/friend":32,"kem/dom":46}],23:[function(require,module,exports){
var { DOM, Link, Modal, app, socket, local } = require('kem/dom');
var Upload = require('kem/lib/upload');

var Post = require('../../../form/post');

var ShareWith = require('./share-with');
var Friend = require('./friend');

var FileID = 0;

module.exports = class FormPost extends Modal {
	constructor(props) {
		super(props);

		this.form = new Post();

		this.state = {
			share_with: lang[local.get('share_with') || 'people'],
			friend: null,
			location: null,
			feel: null,
			upload: []
		};

		// map files uploaded
		this.files = {};
		this.filesCount = 0;
		// save file uploaded, with key is file url
		this.files_data = {};
		// if this.file_uploaded === this.files => uploading successfully
		this.file_uploaded = [];

		this.input_upload = DOM.x('input', { type: 'file', multiple: 'true', onchange: this.upload_action.bind(this), accept: 'video/*,  video/x-m4v, video/webm, video/x-ms-wmv, video/x-msvideo, video/3gpp, video/flv, video/x-flv, video/mp4, video/quicktime, video/mpeg, video/ogv, image/*, audio/mp3, audio/ogg' });
	}

	next(e) {
		this.form.origin = this.props.origin || app.me.id;
		this.form.text = this.find('textarea').val();

		this.form.insert(() => this.emit('close'));
	}

	click_button_upload() {
		this.input_upload.click();
	}

	upload_action(e) {
		var files = e.target.files,
		    count = files.length,
		    array = [];

		if (count > 0 && this.filesCount < 20) {
			if (this.form.type === 'text') this.form.type = files[0].type.split('/')[0];

			for (var i = 0; i < count; i++) {
				var file = files[i];

				if (this.form.test(file.type) || this.filesCount > 20) break;

				++this.filesCount;

				array.push({ id: FileID++, file });
			}

			if (array.length) this.emit('upload', this.state.upload.concat(array));
		}
	}

	componentWillMount() {
		app.on('post:share:with', text => {
			this.emit('share_with', text);
		});
		app.on('post:friend', friend => {
			this.emit('friend', friend);
		});
	}

	edit_image() {}

	header() {
		return lang.share;
	}

	section() {
		var self = this;

		return DOM.x(
			'section',
			{ className: 'form-post', style: 'height: ' + (window.innerHeight - 42 - 52) + 'px; overflow-x: auto;' },
			DOM.x(
				'header',
				{ className: 'clearfix' },
				DOM.x(
					'div',
					{ className: 'pull-left img i40' },
					DOM.x('img', { src: app.me.avatar })
				),
				DOM.x(
					'div',
					{ className: 'pull-left' },
					DOM.x(
						'div',
						null,
						app.me.name
					),
					DOM.x(
						'div',
						{ className: 'share-with' },
						DOM.x(
							Link,
							{ modal: ShareWith, className: 'btn btn-default btn-sm' },
							this.state.share_with
						)
					)
				)
			),
			DOM.x(
				'section',
				{ onmousedown: function () {
						this.children[1].children[0].focus();
					} },
				DOM.x(
					'header',
					null,
					DOM.x('span', { className: 'hidden inline' }),
					this.state.feel.update(function (feel) {
						return DOM.x(
							'div',
							{ className: 'inline' },
							DOM.x(
								'span',
								null,
								'dang'
							),
							DOM.x(
								'span',
								null,
								'cam thay'
							),
							DOM.x(
								'span',
								null,
								'thu vi'
							)
						);
					}),
					this.state.friend.update(function (array) {
						switch (array.length) {
							case 0:
								return null;
							case 1:
								return DOM.x(
									'div',
									{ className: 'composer-post-friend inline' },
									lang.with,
									' ',
									DOM.x(
										'a',
										null,
										array[0].name
									)
								);
							case 2:
								return DOM.x(
									'div',
									{ className: 'composer-post-friend inline' },
									lang.with,
									' ',
									DOM.x(
										'a',
										null,
										array[0].name
									),
									' ',
									lang.and,
									' ',
									DOM.x(
										'a',
										null,
										array[1].name
									)
								);
							default:
								return DOM.x(
									'div',
									{ className: 'composer-post-friend inline' },
									lang.with,
									' ',
									DOM.x(
										'a',
										null,
										array[0].name
									),
									' ',
									lang.and,
									' ',
									DOM.x(
										'a',
										null,
										array.length - 1,
										' other'
									)
								);
						}
					}),
					this.state.location.update(function (location) {
						return DOM.x(
							'div',
							{ className: 'inline' },
							lang.in,
							' ',
							location
						);
					}),
					DOM.x(
						'div',
						{ className: 'hidden inline' },
						'.'
					)
				),
				DOM.x(
					'section',
					{ className: 'form-post-text' },
					DOM.x('textarea', { placeholder: 'What do you mind?' })
				)
			),
			DOM.x(
				'footer',
				null,
				DOM.x(
					'div',
					{ className: 'form-media' },
					this.state.upload.push(function (data) {
						return DOM.x(
							'div',
							{ className: 'form-post-media-item' },
							function (div) {

								var r = new FileReader(),
								    eventName = 'post:file:' + data.id,
								    type = data.file.type.split('/')[0],
								    dom;

								r.onload = function (e) {
									socket.emit('post:file', data.id, data.file.type, e.target.result);
								};
								r.readAsBinaryString(data.file);

								socket.on(eventName, function (name) {
									var url = app.fn.file(name);
									var promise = new Promise(function (resolve) {

										switch (type) {
											case 'image':
												dom = DOM.x('img', { src: url });
												dom.onload = function () {
													resolve({ width: dom.width, height: dom.height });
												};
												break;
											case 'video':
												dom = DOM.x('video', { src: url });
												dom.onloadedmetadata = function () {
													resolve({ width: dom.videoWidth, height: dom.videoHeight, duration: dom.duration });
												};
												break;
											case 'audio':
												dom = DOM.x('audio', { src: url });
												dom.onloadedmetadata = function () {
													resolve({ duration: dom.duration });
												};
												break;
										}

										div.append(dom);
									});

									promise.then(function (data) {
										self.form.file = Object.assign({ name, type, width: 500, height: 250 }, data);
										socket.remove(eventName);
									});
								});
							}
						);
					})
				)
			)
		);
	}

	footer() {
		function pull_left(value) {
			return 'btn btn-default btn-sm pull-left glyphicon glyphicon-' + value;
		};
		return DOM.x(
			'footer',
			{ className: 'form-post' },
			DOM.x('button', { type: 'button', className: pull_left('picture'), onclick: this.click_button_upload.bind(this) }),
			DOM.x(Link, { modal: Friend, className: pull_left('user') }),
			DOM.x(Link, { className: pull_left('heart') }),
			DOM.x(Link, { className: pull_left('map-marker') })
		);
	}
};
},{"../../../form/post":3,"./friend":22,"./share-with":24,"kem/dom":46,"kem/lib/upload":68}],24:[function(require,module,exports){
var { DOM, Link, Modal, local, app } = require('kem/dom');
var list = ['people', 'friend', 'me'];

module.exports = class ShareWith extends Modal {
	notFull() {}

	header() {
		return lang.who_can_view;
	}

	section() {
		var defaultValue = local.get('share_with') || list[0],
		    self = this;

		return DOM.x(
			'section',
			null,
			DOM.x(
				'table',
				{ className: 'share-with' },
				list.map(function (share_with) {
					return DOM.x(
						'tr',
						{ className: 'share-with-item', onclick: function () {
								app.emit('post:share:with', lang[share_with]);
								local.set({ share_with });
								self.remove();
							} },
						DOM.x(
							'td',
							null,
							defaultValue === share_with ? DOM.x('span', { className: 'glyphicon glyphicon-ok' }) : null
						),
						DOM.x(
							'td',
							null,
							DOM.x(
								'strong',
								{ style: 'display: inherit;' },
								lang[share_with]
							),
							DOM.x(
								'small',
								{ style: 'font-size: small' },
								lang['label_' + share_with]
							)
						)
					);
				})
			)
		);
	}
};
},{"kem/dom":46}],25:[function(require,module,exports){
// path: plugin/comment/box/index.js

// This form to using for comment & reply

var { DOM, Link, app } = require('kem/dom');

var Comment = require('../../../model/comment');

var PostText = require('../../../plugin/post-comment/text');
var PluginBox = require('../../../plugin/post-comment');
var CommentMedia = require('./media');

module.exports = class BoxComment extends PluginBox {
	constructor(props) {
		super();

		this.data = new Comment(props.data);
		this.state = this.data.state;
	}

	render() {
		var user = this.data.user;
		return DOM.x(
			'li',
			{ className: 'comment' },
			DOM.x(
				'div',
				{ className: 'clearfix' },
				DOM.x(
					'div',
					{ className: 'pull-left comment-avatar' },
					DOM.x(
						Link,
						{ to: user.url, className: 'img i32' },
						DOM.x('img', { src: user.avatar })
					)
				),
				DOM.x(
					'div',
					{ className: 'pull-left comment-main' },
					DOM.x(
						'div',
						{ className: 'clearfix' },
						DOM.x(
							'div',
							{ className: 'user-name comment-name' },
							DOM.x(
								Link,
								{ to: user.url },
								user.name
							)
						),
						DOM.x(
							'div',
							{ className: 'comment-content' },
							this.text,
							this.data.file ? DOM.x(CommentMedia, { data: this.data.file }) : null
						)
					),
					DOM.x(
						'div',
						{ className: 'clearfix' },
						DOM.x(
							'div',
							{ className: 'pull-left comment-link' },
							this.time,
							DOM.x('span', { className: 'dot dot-sm' })
						),
						DOM.x(
							'div',
							{ className: 'pull-left comment-link comment-vote' },
							DOM.x(
								'a',
								{ onmousedown: this.clicklike.bind(this), className: this.state.like },
								'Like'
							),
							DOM.x('span', { className: 'dot dot-sm' })
						),
						this.state.countVote.update(function (count) {
							return DOM.x(
								'div',
								{ className: 'pull-left comment-link' },
								DOM.x(
									'a',
									null,
									count
								),
								DOM.x('span', { className: 'dot dot-sm' })
							);
						}),
						this.link_reply
					)
				)
			)
		);
	}
};
},{"../../../model/comment":4,"../../../plugin/post-comment":34,"../../../plugin/post-comment/text":35,"./media":26,"kem/dom":46}],26:[function(require,module,exports){
var { DOM, app } = require('kem/dom');

module.exports = class CommentMedia extends DOM {
	get url() {
		return 'http://localhost:9000/asset/file/' + this.props.data.id;
	}
	get image() {
		var i = DOM.x('img', { src: app.fn.image(this.props.data.id, { w: 180, h: 180, q: 20 }), style: 'display: none; width: 180px; height: auto;' });

		i.onload = function () {
			var s = '180px',
			    auto = 'auto';
			if (i.width < i.height) {
				i.style.height = s;
				i.style.width = auto;
			}
			i.style.display = 'block';
		};

		return i;
	}
	get video() {
		return DOM.x('video', { src: this.url, onclick: function () {
				this.paused ? this.play() : this.pause();
			} });
	}
	render() {
		return DOM.x(
			'div',
			{ className: 'comment-media' },
			this[this.props.data.type]
		);
	}
};
},{"kem/dom":46}],27:[function(require,module,exports){
var { DOM, socket } = require('kem/dom');
var Comment = require('../../../form/comment');
var FormCommentMedia = require('./media');

module.exports = class CommentForm extends DOM {
	constructor(props) {
		super(props);

		this.state = { button: false, upload: null };

		this.files = [];
		this.form = new Comment(this.props.data);
		this.input_file = DOM.x('input', { type: 'file', onchange: this.upload.bind(this) });
	}
	click_upload() {
		this.input_file.click();
		this.emit('button', true);
		this.uploading = 1;
	}

	upload(e) {
		var file = e.target.files[0];
		var reader = new FileReader();
		reader.onload = e => {
			socket.emit('comment:upload', { bin: e.target.result, type: file.type, action: 'post' }, file_id => {
				var data = { id: file_id, type: file.type.split('/')[0] };
				this.setState({ button: false, upload: data });
				this.uploading = 0;
				this.form.file = data;
			});
		};
		reader.readAsBinaryString(file);
	}
	delete_file(id) {
		delete this.form.data.file;
		socket.emit('comment:upload', { action: 'delete', id });
	}

	submit() {
		if (this.uploading) return;
		if (!this.text) this.text = this.dom.find('.input-text');

		this.form.text = this.text.value;
		this.form.insert(() => {
			this.text.val('').focus();
			this.emit('upload', null);
		});
	}
	render() {
		return DOM.x(
			'form',
			{ className: 'form-comment relative' },
			this.state.upload.update(file => {
				return DOM.x(FormCommentMedia, { data: file, action: this.delete_file.bind(this) });
			}),
			DOM.x(
				'div',
				{ className: 'clearfix' },
				DOM.x(
					'div',
					{ className: 'pull-left form-upload' },
					DOM.x('button', { type: 'button', className: 'icon icon-upload', onmousedown: this.click_upload.bind(this) })
				),
				DOM.x(
					'div',
					{ className: 'pull-left form-text relative' },
					DOM.x('textarea', { className: 'input-text', placeholder: 'Enter comment here', autofocus: true }),
					DOM.x('button', { type: 'button', className: 'icon icon-emoticon absolute' })
				),
				DOM.x(
					'div',
					{ className: 'pull-right form-submit' },
					DOM.x(
						'button',
						{ type: 'button', onmousedown: this.submit.bind(this), disabled: this.state.button },
						'>'
					)
				)
			)
		);
	}
};
},{"../../../form/comment":1,"./media":28,"kem/dom":46}],28:[function(require,module,exports){
var { DOM, app } = require('kem/dom');

module.exports = class FormCommentMedia extends DOM {
	get video() {
		var cv = document.createElement('canvas');
		var video = DOM.x('video', { src: app.get('asset') + `${this.props.data.id}` });
		var r = new FileReader();
		var timeupdate = function () {
			if (video.currentTime > 2) {
				video.removeListener('timeupdate', timeupdate);
				video.pause();
				snapImage();
			}
		};

		var snapImage = function () {
			cv.width = video.videoWidth;
			cv.height = video.videoHeight;
			cv.getContext('2d').drawImage(video, 0, 0);

			// cv.toBlob(function(blob){
			// 	r.onload = function(e){	
			// 		console.log(e.target.result);
			// 	}
			// 	r.readAsDataURL(blob);
			// });
		};

		video.addEventListener('timeupdate', timeupdate);

		video.preload = 'metadata';
		video.muted = true;
		video.playsInline = true;

		video.play();
	}
	get image() {
		return DOM.x('img', { src: app.get('asset') + `${this.props.data.id}/p100x100` });
	}
	delete_file() {
		this.props.action(this.props.data.id);
	}
	render() {
		return DOM.x(
			'div',
			{ className: 'absolute' },
			DOM.x(
				'div',
				{ className: 'clearfix' },
				DOM.x(
					'div',
					{ className: 'pull-left' },
					this[this.props.data.type]
				),
				DOM.x(
					'div',
					{ className: 'pull-left' },
					DOM.x(
						'button',
						{ type: 'button', onmousedown: this.delete_file.bind(this) },
						'Delete'
					)
				)
			)
		);
	}
};
},{"kem/dom":46}],29:[function(require,module,exports){
var { DOM, app } = require('kem/dom');
var BoxComment = require('./box');
var FormComment = require('./form');

module.exports = class ListReply extends DOM {
	constructor(props) {
		super(props);
		this.state = { comment: props.list };
	}
	componentWillMount() {
		app.on('reply:' + this.props.data.id, comment => {
			this.emit('comment', comment);
		});
	}
	render() {
		var comment = this.props.data;
		return DOM.x(
			'div',
			{ className: 'reply' },
			DOM.x(
				'ul',
				{ className: 'list-comment' },
				this.state.comment.push(function (comment) {
					return DOM.x(BoxComment, { data: comment });
				})
			),
			DOM.x(FormComment, { data: { id: comment.id, user: comment.user } })
		);
	}
};
},{"./box":25,"./form":27,"kem/dom":46}],30:[function(require,module,exports){
var avatar = 'http://localhost:9000/asset/file/58e4b8343c69e770eccc5bd0';
var ListFriend = module.exports = [{ id: 1, name: 'Nguyễn Thế Thuận', avatar: avatar }, { id: 2, name: 'Thuy Chi', avatar: 'http://localhost:9000/asset/file/58e4b8343c69e770eccc5bd0' }, { id: 3, name: 'Nguyen Chi', avatar: avatar }, { id: 4, name: 'Huyen Thanh Hoang', avatar: avatar }, { id: 5, name: 'Thit Mo', avatar: avatar }, { id: 6, name: 'Nguyen Don Tinh', avatar: avatar }, { id: 7, name: 'Sang Anh', avatar: avatar }, { id: 8, name: 'Tran Duc Hiep', avatar: avatar }, { id: 9, name: 'Tran Thi Huyen', avatar: avatar }, { id: 10, name: 'Tang Thanh Huyen', avatar: avatar }, { id: 11, name: 'Nguyen Thi Phuong', avatar: avatar }];
},{}],31:[function(require,module,exports){
var { DOM } = require('kem/dom');

module.exports = class AutoCompleteDone extends DOM {
	handleClick() {
		this.remove();
		this.props.remove_action(this.props.user);
	}
	render() {
		return DOM.x(
			"span",
			{ className: "autocomplete-done" },
			DOM.x(
				"span",
				null,
				this.props.user.name
			),
			DOM.x(
				"a",
				{ className: "autocomplete-remove", onclick: this.handleClick.bind(this) },
				"x"
			)
		);
	}
};
},{"kem/dom":46}],32:[function(require,module,exports){
var { DOM, Link, Modal, cache } = require('kem/dom');

var ListFriend = require('./cache');
var AutoCompleteItem = require('./item');
var AutoCompleteDone = require('./done');
var KEY = { UP: 38, DOWN: 40, ENTER: 13 };
var hide_element = $("#hide_element");

module.exports = class FriendBox extends Modal {
	constructor(props) {
		super(props);
		this.state = { friend: [], autocomplete: null };
	}

	input_text_focus() {
		this.find('input').focus();
	}

	input_text_keyup(e) {
		switch (e.keyCode) {
			case KEY.UP:
				return this.change_className(false);
			case KEY.DOWN:
				return this.change_className(true);
			case KEY.ENTER:
				return this.choose_user();
			default:
				return this.find_friend(e.target.value);
		}
	}

	load_friend_from_server() {
		// if(ME.not.friend){
		// 	this.setState({friend: 'No friend found'});
		// }
	}

	load_friend_from_cache() {
		// if(cache.has('friend')) this.state.friend = cache.get('friend');
		if (cache.has('post:friend')) this.emit('friend', cache.get('post:friend'));
	}

	componentWillMount() {
		this.load_friend_from_server();
		this.load_friend_from_cache();

		this.on('done', function () {
			hide_element.html('');
		});
		this.on('close', function () {
			cache.del('post:friend');
			hide_element.html('');
		});
	}

	change_className(plus) {
		var ul = this.ul,
		    li = ul.find('.active'),
		    dom = null;
		if (li) {
			li.removeClass('active');
			dom = plus ? li.next() || ul.first() : li.prev() || ul.last();
		} else {
			dom = plus ? ul.first() : ul.last();
		};
		if (dom) dom.addClass('active');
	}

	choose_user() {
		var li = this.find('ul > li.active');
		return li ? li.click() : false;
	}
	choose_action(user) {
		this.setState({ friend: user });
		this.input.val('').focus();
		cache.push('post:friend', user);
	}
	remove_friend_action(friend) {
		this.input.focus();
		ListFriend.push(friend);
		cache.pull('post:friend', { id: friend.id });
	}

	find_friend(name) {
		if (!name.trim()) return this.setState({ autocomplete: null, input: 0 });

		var r = new RegExp(name.toLocaleLowerCase()),
		    limit = 20,
		    array = [],
		    current = 0;
		for (var i = 0, n = ListFriend.length; i < n; i++) {
			if (current > limit) break;

			var item = ListFriend[i];
			if (r.test(item.name.toLocaleLowerCase())) {
				array.push(item);
				++current;
			}
		};

		this.setState({
			autocomplete: array.length ? array : null,
			input: hide_element.html(name).get('offsetWidth')
		});
	}

	section() {
		var self = this;

		return DOM.x(
			'section',
			{ style: 'border-bottom: 1px solid #DDD;' },
			DOM.x(
				'div',
				{ onclick: this.input_text_focus },
				this.state.friend.map(friend => {
					return DOM.x(AutoCompleteDone, { user: friend, remove_action: this.remove_friend_action.bind(this) });
				}),
				DOM.x(
					'input',
					{ className: 'autocomplete-input', style: 'width: 20px', autofocus: 'true', onkeyup: this.input_text_keyup.bind(this) },
					function (input) {
						self.input = input;
						self.on('input', function (width) {
							input.style.width = width + 25 + 'px';
						});
					}
				)
			),
			DOM.x(
				'ul',
				{ className: 'autocomplete-list', node: ul => {
						this.ul = ul;
					} },
				this.state.autocomplete.update(array => {
					var frag = document.createDocumentFragment();
					for (var i = 0, n = array.length; i < n; i++) {
						frag.appendChild(DOM.x(AutoCompleteItem, { user: array[i], click: this.choose_action.bind(this) }));
					};
					return frag;
				})
			)
		);
	}
};
},{"./cache":30,"./done":31,"./item":33,"kem/dom":46}],33:[function(require,module,exports){
var { DOM } = require('kem/dom');
var ListFriend = require('./cache');

module.exports = class AutoCompleteItem extends DOM {
	handleClick(e) {
		ListFriend.remove({ id: this.props.user.id });
		this.props.click(this.props.user);
		return this.remove();
	}
	render() {
		var info = this.props.user;
		return DOM.x(
			'li',
			{ className: 'clearfix autocomplete-item', onclick: this.handleClick.bind(this) },
			DOM.x(
				'span',
				{ className: 'pull-left' },
				DOM.x('img', { src: info.avatar, className: 'img i32' })
			),
			DOM.x(
				'span',
				{ className: 'pull-left' },
				info.name
			)
		);
	}
};
},{"./cache":30,"kem/dom":46}],34:[function(require,module,exports){
var { DOM, Link, app } = require('kem/dom');
var PostText = require('./text');
var ViewLike = require('./view-like');

module.exports = class PostBox extends DOM {

	get text() {
		return this.data.text ? DOM.x(PostText, { text: this.data.text }) : null;
	}
	get time() {
		return DOM.x(
			'span',
			{ className: 'link-time' },
			span => {
				this.data.time(time => span.html(time));
			}
		);
	}

	clicklike() {
		this.data.click_like('like');
	}

	componentWillMount() {
		app.on('like:' + this.data.id, data => {
			var itme = app.me.id === data.user;
			switch (data.action) {
				case 'delete':
					this.data.like = null;
					this.data.sub = data.name;
					this.emit('countVote', this.data.vote);
					if (itme) this.emit('like', '');
					break;
				case 'post':
					this.data.like = data;
					this.data.plus = data.name;
					this.emit('countVote', this.data.vote);
					if (itme) this.emit('like', data.name);
					break;
				case 'put':
					this.data.like = data;
					this.data.sub = data.from;
					this.data.plus = data.name;
					if (itme) this.emit('like', data.name);
					break;
				case 'get':
					Link.modal(ViewLike, { data });
					break;
			}

			this.data.wait.like = 0;
		});
	}
};
},{"./text":35,"./view-like":36,"kem/dom":46}],35:[function(require,module,exports){
var { DOM } = require('kem/dom');

module.exports = class PostText extends DOM {

	constructor(props) {
		super(props);
		this.data = {};
	}

	replaceText(text) {
		return text.replace(/\n/g, '<br/>');
	}

	get text() {
		if (!this.data.text) this.data.text = this.replaceText(this.props.text);
		return this.data.text;
	}

	get short() {
		if (!this.data.short) {
			if (this.props.text.length > 400) {
				this.data.short = this.replaceText(this.props.text.substr(0, 200)) + '...';
			}
		}
		return this.data.short;
	}

	handleClick(e) {
		var link = e.target,
		    text = link.prev();

		if (this.has_click) {
			text.innerHTML = this.short;
			link.textContent = 'read more';
			this.has_click = 0;
		} else {
			text.innerHTML = this.text;
			link.textContent = 'shortcut';
			this.has_click = 1;
		}
	}

	render() {
		return DOM.x(
			'p',
			{ className: 'post-text' },
			DOM.x(
				'span',
				null,
				this.short || this.text
			),
			this.short ? DOM.x(
				'a',
				{ onclick: this.handleClick.bind(this) },
				'read more'
			) : null
		);
	}
};
},{"kem/dom":46}],36:[function(require,module,exports){
var { DOM, Modal } = require('kem/dom');
var User = require('../../model/user');

module.exports = class ViewLike extends Modal {
	constructor(props) {
		super(props);
		this.state = { likes: props.data };
	}

	header() {
		return 'People likes this';
	}

	section() {
		return DOM.x(
			'ul',
			{ id: 'list-like' },
			this.state.likes.push(function (like) {
				var user = new User(like.user);
				return DOM.x(
					'li',
					null,
					'Like'
				);
			})
		);
	}
};
},{"../../model/user":7,"kem/dom":46}],37:[function(require,module,exports){
var dom = require('kem/dom'),
    { WS } = require('kem/dom');
var socket = dom.ws = new WS('ws://localhost:9001');
},{"kem/dom":46}],38:[function(require,module,exports){
var { app, socket } = require('kem/dom');

/**
 *	Chat Text
 */
socket.on('chat:post', function (data) {
	app.emit('chat:' + data.room, data);

	if (app.me.id !== data.user) {
		// notify to user
		console.log(data);
	}
});
// writing chat
socket.on('chat:w', function (data) {
	dom.emit('chat:w:' + data.room, data);
});

/**
 *	Chat Video
 */
socket.on('chat:v:req', function (data) {});
socket.on('chat:v:res', function (data) {});
},{"kem/dom":46}],39:[function(require,module,exports){
var { app, socket } = require('kem/dom');

socket.on('comment:post', function (error, data) {
	app.emit('reply:' + data.parent, data);
});
socket.on('comment:get', function (error, data) {});
},{"kem/dom":46}],40:[function(require,module,exports){
var dom = require('kem/dom'),
    { WS, local, Link, app, cookie } = dom;
var socket = dom.socket = new WS('ws://localhost:9000');
var hasLogin = require('../use/has-login');
var User = require('../model/user');

socket.on('open', function () {
	if (hasLogin()) {
		app.me = new User(local.get('user').array());
		socket.emit('authenticate', app.me.data, local.get('token'), function () {
			app.emit('delete-cookie');
		});
	}

	app.set('ready', true);
});

// set cookie and authenticate after login
app.on('set-cookie', function (user, time, token) {
	app.me = new User(user);
	app.routes[0].fn = require('../phone/index');
	Link.to('/');

	user.time = time;
	local.set({ user: user.json(), token });
	cookie.init({ day: 365, path: '/' });
	cookie.set({ user: user.id, time });

	socket.emit('feed:get', { user: app.me.id, time: Date.now() });
});

// delete cookie when logout
app.on('delete-cookie', function () {
	local.remove('token');
	cookie.remove('user', 'time');
	app.me = null;
	Link.to('/');
});

/**
 *	Working for Post
 */
require('./post');

/**
 *	Working for Comment
 */
require('./comment');

/**
 *	Working for Chat
 */
require('./chat');

/**
 *	Working for User
 */
require('./user');
},{"../model/user":7,"../phone/index":17,"../use/has-login":45,"./chat":38,"./comment":39,"./post":41,"./user":42,"kem/dom":46}],41:[function(require,module,exports){
var { app, socket } = require('kem/dom');

socket.on('post:new', function (data) {
	app.emit('post:new', data);
});

socket.on('like', function (error, data) {
	if (error) console.log(error, data);else app.emit('like:' + data.of, data);
});
},{"kem/dom":46}],42:[function(require,module,exports){
var { app, socket } = require('kem/dom');

socket.on('friend:request', function (data) {});
socket.on('friend:response', function (data) {});
},{"kem/dom":46}],43:[function(require,module,exports){
var { app, Link } = require('kem/dom');
var gotologin = function () {
	Link.to('/account/login');
	app.set('next', window.location.href);
};

module.exports = function authenticate(next) {
	if (app.me) return next();

	setTimeout(function run() {
		if (app.get('ready')) return app.me ? next() : gotologin();
		setTimeout(run);
	});
};
},{"kem/dom":46}],44:[function(require,module,exports){
var { DOM } = require('kem/dom');

module.exports = class ErrorPage extends DOM {
	render() {
		return DOM.x(
			'div',
			null,
			'This page not found'
		);
	}
};
},{"kem/dom":46}],45:[function(require,module,exports){
var { cookie, local } = require('kem/dom');

module.exports = function hasLogin() {
	return cookie.has('user') && cookie.has('time') && local.has('user');
};
},{"kem/dom":46}],46:[function(require,module,exports){
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
},{"../lib/async.js":59,"../lib/cache.js":60,"../lib/check.js":61,"../lib/cookie/index.js":62,"../lib/event":63,"../lib/is.js":64,"../lib/socket.js":65,"./lib/dom.js":49,"./plugin/link.js":53,"./plugin/local.js":54,"./plugin/modal.js":55,"./plugin/router.js":56,"./plugin/session.js":57}],47:[function(require,module,exports){
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
},{"./state-node":52}],48:[function(require,module,exports){
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
},{}],49:[function(require,module,exports){
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
},{"../../lib/event.js":63,"./append-child.js":47,"./attribute.js":48,"./state-element.js":50}],50:[function(require,module,exports){
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
},{"./state-event":51}],51:[function(require,module,exports){
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
},{}],52:[function(require,module,exports){
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
},{}],53:[function(require,module,exports){
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
},{"../lib/dom.js":49,"./router.js":56}],54:[function(require,module,exports){
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
},{}],55:[function(require,module,exports){
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
},{"../lib/dom.js":49}],56:[function(require,module,exports){
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
},{"../lib/dom.js":49}],57:[function(require,module,exports){
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
},{}],58:[function(require,module,exports){
/**
 *	Array Prototype
 */

function FindStringParser(condition) {
	var where = condition.split(/(and|or)/g).map(function (i) {
		switch (i) {
			case 'and':
				return '&&';
			case 'or':
				return '||';
			default:
				return '$.' + i.replace('=', '==');
		}
	});
	return where.join(' ');
};

Object.defineProperties(Array.prototype, {
	__concat: {
		value: function () {
			this.__isconcat = 1;
			return this;
		}
	},
	__set: {
		value: function (index, value) {
			this.__index = index;
			this.__value = value;
			return this;
		}
	},
	__findOne: {
		value: function (condition) {
			if ('object' === typeof condition) {
				// {id: 1}
				for (var i = 0, n = this.length; i < n; i++) {
					var wrong = 0;
					for (var key in condition) {
						if (condition[key] !== this[i][key]) {
							wrong = 1;
							break;
						}
					};
					if (!wrong) return this.__set(i, this[i]);
				}
			} else {
				for (var i = 0, n = this.length; i < n; i++) {
					if (condition === this[i]) return this.__set(i, this[i]);
				}
			};
			return this.__set(-1);
		}
	},
	index: {
		value: function index(condition) {
			if (condition) this.__findOne(condition);
			return this.__index;
		}
	},
	has: {
		value: function has(condition) {
			return !(this.__findOne(condition).__index < 0);
		}
	},
	get: {
		value: function get(condition) {
			if (condition) this.__findOne(condition);
			return this.__value;
		}
	},
	find: {
		value: function find(condition, limit) {
			var limit = limit || this.length,
			    array = [],
			    i = 0,
			    n = this.length,
			    ok = 0,
			    wrong;

			switch (typeof condition) {
				case 'string':
					/**
				      * where: 	id = 1 and name = 'Thuan'
				      */

					var where = FindStringParser(condition);
					for (; i < n; i++) {
						if (limit === ok) break;
						if (function ($) {
							return eval(where);
						}(this[i])) {
							array.push(this[i]);
							++ok;
						};
					}
				case 'object':
					for (; i < n; i++) {
						if (limit === ok) break;
						wrong = 0;

						for (var key in condition) {

							if (condition[key] !== this[i][key]) {
								wrong = 1;
								break;
							}
						}

						if (!wrong) {
							array.push(this[i]);
							++ok;
						}
					};
					break;
			}

			return array;
		}
	},
	remove: {
		value: function remove(condition) {
			if (this.has(condition)) this.splice(this.__index, 1);
		}
	},
	removeAll: {
		value: function removeAll(condition) {
			var wrong,
			    i = 0,
			    n = this.length;
			if ('object' === typeof condition) {
				for (; i < n; i++) {
					wrong = 0;

					for (var key in condition) {

						if (condition[key] !== this[i][key]) {
							wrong = 1;
							break;
						}
					}

					if (!wrong) this.splice(i, 1);
				}
			} else {
				for (; i < n; i++) {
					if (condition === this[i]) this.splice(i, 1);
				}
			}
		}
	},
	json: {
		value: function toJson() {
			return JSON.stringify(this);
		}
	},
	unique: {
		value: function unique() {
			this.sort();
			for (var i = 0, n = this.length; i < n; i++) {
				if (this[i] === this[i + 1]) this.splice(i, 1);
			}
		}
	}
});
/**
 *	DOM Element Prototype
 */
Element.prototype._event = {};

Object.defineProperties(Element.prototype, {
	set: {
		value: function set(key, value) {
			this[key] = value;
		}
	},
	get: {
		value: function get(key) {
			return this[key];
		}
	},
	find: {
		value: function find(selector) {
			switch (typeof selector) {
				case 'string':
					return this.querySelector(selector);
				case 'number':
					return this.children[selector];
			}
		}
	},
	findAll: {
		value: function findAll(selector) {
			return this.querySelectorAll(selector);
		}
	},
	parent: {
		value: function parent(selector) {
			return selector ? this.closest(selector) : this.parentElement;
		}
	},
	last: {
		value: function last() {
			return this.lastElementChild;
		}
	},
	first: {
		value: function first() {
			return this.children[0];
		}
	},
	next: {
		value: function next(virual) {
			return virual ? this.nextSibling : this.nextElementSibling;
		}
	},
	prev: {
		value: function prev(virual) {
			return virual ? this.previousSibling : this.previousElementSibling;
		}
	},
	html: {
		value: function html(html) {
			if (undefined === html) return this.innerHTML;

			if ('object' === typeof html) {
				this.innerHTML = '';
				this.append(html);
			} else {
				this.innerHTML = html;
			};
			return this;
		}
	},
	text: {
		value: function text(text) {
			if (undefined === text) return this.innerText;

			this.innerText = text;
			return this;
		}
	},
	val: {
		value: function value(value) {
			if (undefined === value) return this.value;

			this.value = value;
			return this;
		}
	},
	css: {
		value: function css(name, value) {
			if (undefined === value) {
				switch (typeof name) {
					case 'string':
						return this.style[name];
					case 'object':
						Object.assign(this.style, name);break;
				}
			} else {
				this.style[name] = value;
			};
			return this;
		}
	},
	attr: {
		value: function attr(name, value) {
			if (undefined === value) {
				switch (typeof name) {
					case 'string':
						return this.getAttribute(name);
					case 'object':
						Object.assign(this, name);break;
				}
			} else {
				this.setAttribute(name, value);
			};
			return this;
		}
	},
	removeAttr: {
		value: function removeAttr(name) {
			this.removeAttribute(name);
			return this;
		}
	},
	hasClass: {
		value: function hasClass(name) {
			return this.classList.contains(name);
		}
	},
	addClass: {
		value: function addClass(name) {
			this.classList.add(name);
			return this;
		}
	},
	removeClass: {
		value: function removeClass(name) {
			this.classList.remove(name);
			return this;
		}
	},
	changeClass: {
		value: function changeClass(oldClass, newClass) {
			this.classList.remove(oldClass);
			this.classList.add(newClass);
			return this;
		}
	},
	append: {
		value: function append(node) {
			this.appendChild('object' === typeof node ? node : document.createTextNode(node));
			return this;
		}
	},
	prepend: {
		value: function prepend(node) {
			this.insertBefore('object' === typeof node ? node : document.createTextNode(node), this.children[0]);
		}
	},
	replace: {
		value: function replace(oldNode, newNode) {
			if (newNode) this.replaceChild(newNode, oldNode);else oldNode.parentElement.replaceChild(this, oldNode);
		}
	},
	before: {
		value: function before(currentNode) {
			if ('string' === typeof currentNode) currentNode = document.querySelector(currentNode);
			if (currentNode) currentNode.parentElement.insertBefore(this, currentNode);
		}
	},
	after: {
		value: function after(currentNode) {
			if ('string' === typeof currentNode) currentNode = document.querySelector(currentNode);
			if (currentNode) currentNode.parentElement.insertBefore(this, currentNode.nextSibling);
		}
	},
	hide: {
		value: function hide() {
			this.style.display = 'none';
			return this;
		}
	},
	show: {
		value: function show() {
			this.style.display = 'block';
			return this;
		}
	},
	toggle: {
		value: function toggle() {
			this.hidden = !this.hidden;
			return this;
		}
	},
	clone: {
		value: function clone() {
			return this.cloneNode(true);
		}
	},
	on: {
		value: function on(name, fn) {
			this._event[name] ? this._event[name].push(fn) : this._event[name] = [];
		}
	},
	emit: {
		value: function emit(name, ...value) {
			var list = this._event[name] || [],
			    fn = function (i) {
				list[i].apply([], value);
			};

			for (var i = 0, n = list.length; i < n; i++) {
				setTimeout(fn.call(null, i), 0);
			}
		}
	},
	setState: {
		value: function setState(list) {
			for (let i in list) {
				this.emit(i, list[i]);
			}
		}
	},
	index: {
		value: function index(where) {
			if (where) return Array.prototype.index.call(this.parentElement, where);

			var children = this.children,
			    i = 0,
			    n = children.length;
			for (; i < n; i++) {
				if (this === children[i]) return i;
			};
			return -1;
		}
	}
});

/**
 *	Query Function
 */

class Ajax {
    constructor(option) {
        this.a = document.createElement('a');
        this.x = new XMLHttpRequest();
        this.define = {
            header: { 'X-Requested-With': 'XMLHttpRequest' },
            method: 'get',
            type: 'json'
        };

        Object.assign(this, option);

        this.x.open(this.method, this.a.href, true);
        this.x.send(this.define.data);
    }

    set method(method){
        this.define.method = method;
    }
    set url(url){
        this.a.href = url;
    }
    set type(type){
        this.define.type = type;
    }
    set header(header){
        var h = Object.assign(this.define.header, header);

        for(var key in h){
            this.x.setRequestHeader(key, h[key])
        }
    }
    set data(data){
        if('GET' === this.method){
            var array = [];
            for(var i in data) {
                array.push(i + '=' + data[i])
            }
            this.a.search = array.join('&');
            this.define.header['Content-Type'] = 'text/plain';
        }else{
            this.define.header['Content-Type'] = 'application/json';
            this.define.data = JSON.stringify(data);
        }
    }
    set file(file){
        this.define.type = 'text';
        this.define.header['Content-Type'] = file.type;
        this.define.data = file;
    }
    set success(fn){
        var type = this.define.type;

        this.x.onreadystatechange = function(){
            if(this.readyState === 4 && this.status === 200){
                switch(type){
                    case 'json':
                        return fn(JSON.parse(this.responseText));
                    default:
                        return fn(this.responseText);
                }
            }
        }
    }
    set progress(fn){
        this.x.upload.onprogress = function(e){
            fn(e.loaded / e.total)
        }
    }
    set error(fn){
        this.x.onerror = fn;
    }

    get method(){
        return this.define.method.toUpperCase();
    }
}

(function(global){

	function $(dom) {
		return document.querySelector(dom);
	}

	$.ajax = function(option){
		new Ajax(option)
	}

	$.get = function(url, data, success){
		new Ajax({
			method: 'GET',
			url, data, success,
			type: 'json'
		})
	}

	$.post = function(url, data, success){
		new Ajax({
			method: 'POST',
			url, data, success,
			type: 'json'
		})
	}

	$.put = function(url, data, success){
		new Ajax({
			method: 'PUT',
			url, data, success,
			type: 'json'
		})
	}

	$.delete = function(url, data, success){
		new Ajax({
			method: 'DELETE',
			url, data, success,
			type: 'json'
		})
	}

	$.upload = function(url, file, success, progress){
		new Ajax({
			url, file, success, progress
		})
	}

	/**
	 *	Create StyleSheet: .className{ key: value; }
	 *	Option: { className: {key: value} }
	 */
	$.style = function (option) {
		setTimeout(function() {
			var dom = document.getElementsByTagName('style')[0], text = [];

			if (!dom) {
				dom = document.createElement('style');
				document.head.append(dom);
			}

			for (let className in option) {
				let item = [],
				    cls = option[className];
				for (let key in cls) {
					item.push(key + ':' + cls[key]);
				};

				text.push(className + '{' + item.join(';') + '}');
			}

			dom.append(text.join(''));
		})
	}

	global.$ = $;

})(window);

/**
 * 	Object Prototype
 */
Object.defineProperties(Object.prototype, {
	forEach: {
		value: function forEach(fn) {
			for (var key in this) {
				fn(this[key], key);
			}
		}
	},
	json: {
		value: function toJson() {
			return JSON.stringify(this);
		}
	},
	extend: {
		value: function extend(target) {
			Object.assign(this, target);
			return this;
		}
	},
	map: {
		value: function (fn) {
			for (var i in this) {
				this[i] = fn.call(null, this[i], i);
			};
			return this;
		}
	}
});
/**
 *	String Prototype
 */
Object.defineProperties(String.prototype, {
	clean: {
		value: function clean() {
			return this.replace(/[\n\r\t]{2,}/g, '\n\n').replace(/[\n\r\t]/g, '\n').replace(/^[\s\n]+/, '').replace(/[\s\n]+$/, '');
		}
	},
	array: {
		value: function toArray() {
			return JSON.parse(this);
		}
	},
	trim: {
		value: function(){
			return this.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, " ");
		}
	}
});
},{}],59:[function(require,module,exports){
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
},{}],60:[function(require,module,exports){
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
},{}],61:[function(require,module,exports){
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
},{"./trim":67}],62:[function(require,module,exports){
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
},{}],63:[function(require,module,exports){
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
},{}],64:[function(require,module,exports){
var Check = require('./check'), is = module.exports = new Check();
},{"./check":61}],65:[function(require,module,exports){
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
},{}],66:[function(require,module,exports){
var ListDate = ['Sat', 'Sun', '', '', '', 'Fri', ''];
var ListMonth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
var thisYear = (new Date()).getFullYear();

var Timer = module.exports = {
	fixtime: function (time) {
		return time < 10 ? '0' + time : time;
	},
	timestring: function (date) {
		var array = [ListDate[date.getDate()]], day = [date.getDay(), date.getMonth() + 1];

		if(thisYear !== date.getFullYear()) day.push(date.getFullYear());

		array.push(day.join('/'));
		array.push('on', this.fixtime(date.getHours()) + ':' + this.fixtime(date.getMinutes()));
		return array.join(' ');
	},
	timeupdate: function (current) {
		var curmins = Math.floor(current / 60),
		    cursecs = Math.floor(current - curmins * 60),
		    text = [this.fixtime(curmins), this.fixtime(cursecs)].join(':');

		return current === 0 ? text : current === 0 ? '00:00' : '- ' + text;
	},
	timeago: function (timeint) {
		var date = new Date(timeint), now = new Date();

		if(date.getFullYear() !== thisYear) return {text: this.timestring(date)};

		var time = now - date,
		    sec = parseInt(time / 1000),
		    min = parseInt(sec / 60),
		    hour = parseInt(min / 60);
		
		if (hour > 23) return { text: this.timestring(date) };
		if (hour > 1) return { text: hour + ' ' + lang.timeago_hour, timeout: 300000 };
		if (hour > 0) return { text: '1 ' + lang.timeago_hour, timeout: 300000 };
		if (min > 1) return { text: min + ' ' + lang.timeago_min, timeout: 7000 };
		if (min > 0) return { text: '1 ' + lang.timeago_min, timeout: 7000 };
		return { text: lang.timeago_now, timeout: 2000 };
	}
}
},{}],67:[function(require,module,exports){
module.exports = function trim(str) {
	return str.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, " ");
}
},{}],68:[function(require,module,exports){
module.exports = class Upload {
	constructor(file) {
		this.type = file.type;
		this.r = new FileReader();
		this.r.readAsBinaryString(file);
	}

	success(fn) {
		var type = this.type;
		this.r.onload = function (e) {
			Upload.socket.emit('upload', {bin: e.target.result, type: type, user: Upload.user}, fn);
		}
	}

	progress(fn) {
		this.r.onprogress = function (e) {
			fn(e.loaded / e.total);
		}
	}
}
},{}]},{},[15])