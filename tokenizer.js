'use strict';

let tokenizer = function () {
	function analyzeExpression(data) {
		if (!data) return;

		// clean all whitespace characters
		var clean = data.replace(/[\s]/g, '');
		var chars = clean.split('');

		// check that expression does not contain forbidden symbols
		var indexes = [];
		chars.forEach((tok, pos) => {
			if (!/[a-zA-Z0-9.+\-/*()]/.test(tok)) {
				indexes.push(pos);
			}	
		});
		
		if (indexes.length) {
			return {
				error : true,
				reason : 'Some of the symbols are not valid',
				input : clean,
				chars,
				indexes
			}
		}

		// break string into array of tokens
		var tokens = tokenize(clean);

		// check that there are no operators on beginning or end of string
		indexes.length = 0;
		if (tokens[0].type == 'operator') indexes.push(0); 
		if (tokens[tokens.length - 1].type == 'operator') indexes.push(tokens.length - 1); 
		if (indexes.length) {
			return {
				error : true,
				reason : 'Not allowed to put operators on beginning or end of expression',
				input : clean,
				tokens,
				indexes
			}	
		}

		// check that there is no misplaced dots
		console.log('Some dots are misplaced.'.red);
		indexes = tokens.filter(tok => tok.type == 'dot').map((tok, pos) => pos);
		if (indexes.length) {
			return {
				error : true,
				reason : 'Some dots are misplaced',
				input : clean,
				tokens,
				indexes,
			}
		}
		
		// check that amount of '(' and ')' is the same
		var openBrackets = tokens.filter(tok => tok.type == 'open bracket').length;
		var closeBrackets = tokens.filter(tok => tok.type == 'close bracket').length;
		if (openBrackets != closeBrackets) {
		return {
				error : true,
				reason : 'Brackets parity is not ok. Open ' + openBrackets + ', close ' + closeBrackets,
				tokens,
				input : clean,
			}
		}
		
		// check that brackets are balanced
		indexes.length = 0;
		for (let i = 0, count = 0; i < tokens.length; i++) {
			if (tokens[i].type == 'open bracket') count++;
			if (tokens[i].type == 'close bracket') count--;
			if (count < 0) {
				indexes.push(i);
				count = 0;
			}
		}
		if (indexes.length) {
			return {
				error : true,
				reason : 'Brackets are unbalanced',
				input : clean,
				tokens,
				indexes
			}
		}

		// check that there is no empty brackets
		indexes.length = 0;
		tokens.forEach((tok, pos, arr) => {
			if (/(open bracket)/.test(tok.type) && pos != arr.length - 1 && 
				/(close bracket)/.test(arr[pos + 1].type)) {
					indexes.push(pos, pos + 1);
			}
		});
		if (indexes.length) {
			return {
				error : true,
				reason : 'Empty brackets are not allowed',
				input : clean,
				tokens,
				indexes
			}
		}

		// check that there operator is not missing
		indexes.length = 0;
		tokens.forEach((tok, pos, arr) => {
			if (/(number|var|close bracket)/.test(tok.type) && pos != arr.length - 1 && 
				/(number|var|open bracket)/.test(arr[pos + 1].type)) {
					indexes.push(pos, pos + 1);
			}
		});
		if (indexes.length) {
			return {
				error : true,
				reason : 'Operator is missing',
				input : clean,
				tokens,
				indexes
			}
		}

		// check that there are no operators or closing brackets after operators and opening brackets
		indexes.length = 0;
		tokens.forEach((tok, pos, arr) => {
			if (/(operator|open bracket)/.test(tok.type) && /(operator|close bracket)/.test(arr[pos + 1].type)) {
				indexes.push(pos);
			}
		});
		if (indexes.length) {
			return {
				error : true,
				reason : 'Should be number, variable or opening bracket after following token(s)',
				input : clean,
				tokens,
				indexes
			}	
		}

		return {
			input : clean,
			tokens,
		}
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

	return {
		parse : analyzeExpression,
	}
}();

