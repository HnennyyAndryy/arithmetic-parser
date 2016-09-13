'use strict';
var colors = require('colors');

var stdin = process.openStdin();

stdin.addListener('data', d => {
	if (!d.toString().trim()) return;
	handleInput(d.toString());
});


function handleInput(data) {
	// clean all whitespace characters
	var clean = data.replace(/[\s]/g, '');

	var chars = clean.split('');
	var errs = [];
	// check that expression does not contain forbidden symbols
	chars.forEach((tok, pos) => {
		if (! /[a-zA-Z0-9.+\-/*()]/.test(tok) ) {
			errs.push(pos);
		}	
	});
	var colored = chars.map((tok, pos) => ~errs.indexOf(pos) ? tok.red : tok.green); 
	
	if (errs.length) {
		return console.log('Some of the symbols are not valid'.red);
		console.log(colored);
	}
	console.log('All symbols are valid'.green);

	// break string into array of tokens
	var tokens = tokenize(clean);

	console.log('Tokens are : '.bold);
	console.log(tokens);
	console.log('EXPRESSION : '.bold);
	console.log(tokens.map(tok=>tok.val).join('').bold.blue);

	errs.length = 0;
	// check that there is no misplaced dots
	var misplacedDots = tokens.filter(tok => tok.type == 'dot').length > 0;
	if (misplacedDots) {
		console.log('Some dots are misplaced.'.red);
		colored = tokens.map((tok, pos) => tok.type == 'dot' ? tok.val.red : tok.val.green); 
		console.log(colored.join(''));
		return;
	}
	console.log('Dots are placed correctly.'.green);

	errs.length = 0;
	// check that amount of '(' and ')' is the same
	var openBrackets = tokens.filter(tok => tok.type == 'open bracket').length;
	var closeBrackets = tokens.filter(tok => tok.type == 'close bracket').length;
	if (openBrackets == closeBrackets) {
		console.log('Brackets parity is ok. '.green + openBrackets + ' pairs');
	} else {
		return console.log('Brackets parity is not ok.'.red + ' Open ' + openBrackets + ', close ' + closeBrackets);
	}
	
	// check that brackets are balanced
	var errs = [];
	for (let i = 0, count = 0; i < tokens.length; i++) {
		if (tokens[i].type == 'open bracket') count++;
		if (tokens[i].type == 'close bracket') count--;
		if (count < 0) {
			errs.push(i);
			count = 0;
		}
	}
	if (errs.length) {
		console.log('Brackets are unbalanced.'.red);
		var colored = tokens.map((tok, pos) => ~errs.indexOf(pos) ? tok.val.red : tok.val);
		console.log(colored.join(''));
		return;
	}

	// check that after number,var and closing bracket there should be an operator or closing bracket
	var errors = false;
	var marked = tokens.map((tok, pos, arr) => {
		if (/(number|var|close bracket)/.test(tok.type)) {
			if (pos != arr.length - 1 && !/(operator|close bracket)/.test(arr[pos+1].type)) {
				tok.error = true;
				errors = true;
			}
		}
		return tok;
	});
	if (errors) {
		console.log('Missing operators in following places :'.red);
		var colored = marked.map(tok => tok.error ? tok.val + ' _ '.red.bold : tok.val);
		console.log(colored.join(''));
		return;
	}

	// check that there are no operators on beginning or end of string
	var marked = tokens.slice();
	if (marked[0].type == 'operator') marked[0].error = true; 
	if (marked[marked.length - 1].type == 'operator') marked[marked.length - 1].error = true; 
	if (marked[0].error || marked[marked.length - 1].error) {
		console.log('Not allowed to put operators on beginning or end of expression'.red);
		var colored = marked.map(tok => tok.error ? tok.val.red : tok.val.green);
		console.log(colored.join(''));
		return;
	}
	console.log('Operators are placed correctly.'.green);

	// check that there are no operators or closing brackets after operators
	var errors = false;
	var marked = tokens.map((tok, pos, arr) => {
		if (/(operator)/.test(tok.type) && /(operator|close bracket)/.test(arr[pos+1].type)) {
			tok.error = true;
			errors = true;

		}
		return tok;
	});
	if (errors) {
		console.log('Missing variables or numbers in following places :'.red);
		var colored = marked.map(tok => tok.error ? tok.val + ' _ '.red.bold : tok.val);
		console.log(colored.join(''));
		return;
	}

	// check that there only number, variable or open bracket after open brackets
	var errors = false;
	var marked = tokens.map((tok, pos, arr) => {
		if (/(open bracket)/.test(tok.type)) {
			if (!/(number|var|open bracket)/.test(arr[pos+1].type)) {
				tok.error = true;
				errors = true;
			}
		}
		return tok;
	});
	if (errors) {
		console.log('After open bracket there should be number or variable :'.red);
		var colored = marked.map(tok => tok.error ? tok.val + ' _ '.red.bold : tok.val);
		console.log(colored.join(''));
		return;
	}


	console.log('OK'.green.bold);
}

function tokenize(input) {
	var tokens = [];
	var chars = input.split('');
	var curToken;
	chars.forEach((char, pos) => {
		var curCharType;
		if (/[0-9]/.test(char)) curCharType = 'number';
		if (/[a-zA-Z]/.test(char)) curCharType = 'letter';
		if (char == '.') curCharType = 'dot';
		if (/[-+*/]/.test(char)) curCharType = 'operator';
		if (char == '(') curCharType = 'open bracket';
		if (char == ')') curCharType = 'close bracket';

		switch (curCharType) {
			case 'number' :
			if (curToken && (curToken.type == 'number' || curToken.type == 'var')) {
				curToken.val += char;
			} else {
				if (curToken) tokens.push(curToken);
				curToken = {
					val : char,
					type : 'number',
					dotPresent : false,
					pos
				};
			}
			break;
			case 'dot' :
			if (curToken && curToken.type == 'number' && !curToken.dotPresent) {
				curToken.val += char;
				curToken.dotPresent = true;
			} else {
				if (curToken) tokens.push(curToken);
				curToken = {
					val : char,
					type : 'dot',
					dotPresent : false,
					pos
				};
			}
			break;
			case 'letter' :
			if (curToken && curToken.type == 'var') {
				curToken.val += char;
			} else {
				if (curToken) tokens.push(curToken);
				curToken = {
					val : char,
					type : 'var',
					pos
				};
			}
			break;
			case 'operator' :
			if (curToken) tokens.push(curToken);
			curToken = {
				val : char,
				type : 'operator',
				pos
			}
			break;
			case 'open bracket' :
			if (curToken) tokens.push(curToken);
			curToken = {
				val : char,
				type : 'open bracket',
				pos
			}
			break;
			case 'close bracket' :
			if (curToken) tokens.push(curToken);
			curToken = {
				val : char,
				type : 'close bracket',
				pos
			}
			break;
		}

	});
	if (curToken) tokens.push(curToken);
	return tokens;
}

handleInput('*(var1 - 43.9 ) * (c + d) - e-');