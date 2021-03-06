'use strict';

let tokenizer = function () {
	function analyzeExpression(data) {
		if (!data) return;

		// clean all whitespace characters
		var input = data.replace(/[\s]/g, '');
		var errors = [];
		// indexes of errors
		var indexes = [];

		// break string into array of tokens
		var tokens = tokenize(input);

		// check that expression does not contain forbidden symbols
		indexes = tokens.map((tok, pos) => tok.type == 'unknown' ? pos : -1).filter(ind => ~ind);
		if (indexes.length) {
			errors.push({
				reason : 'Some of the symbols are not valid',
				indexes,
			});
		}

		// check that there are no operators on beginning or end of string
		indexes = [];
		var t_first = tokens[0];
		var t_last = tokens[tokens.length - 1];
		if (t_first.type == 'operator' && !/[+-]/.test(t_first.val)) indexes.push(0); 
		if (t_last.type == 'operator' && !/[+-]/.test(t_first.val)) indexes.push(tokens.length - 1); 
		if (indexes.length) {
			errors.push({
				reason : 'Not allowed to put operators on beginning or end of expression',
				indexes
			});	
		}

		// check that there is no misplaced dots
		indexes = tokens.map((tok, pos) => tok.type == 'dot' ? pos : -1).filter(ind => ~ind);
		if (indexes.length) {
			errors.push({
				reason : 'Some dots are misplaced',
				indexes,
			});
		}

		// check that amount of '(' and ')' is the same
		indexes = [];
		var openBrackets = tokens.filter(tok => tok.type == 'open bracket').length;
		var closeBrackets = tokens.filter(tok => tok.type == 'close bracket').length;
		if (openBrackets != closeBrackets) {
		errors.push({
				reason : 'Brackets parity is not ok. Open ' + openBrackets + ', close ' + closeBrackets,
				indexes,
			});
		}
		
		// check that brackets are balanced
		indexes = [];
		for (let i = 0, count = 0; i < tokens.length; i++) {
			if (tokens[i].type == 'open bracket') count++;
			if (tokens[i].type == 'close bracket') count--;
			if (count < 0) {
				indexes.push(i);
				count = 0;
			}
		}
		if (indexes.length) {
			errors.push({
				reason : 'Brackets are unbalanced',
				indexes
			});
		}

		// check that there is no empty brackets
		indexes = [];
		tokens.forEach((tok, pos, arr) => {
			if (/(open bracket)/.test(tok.type) && pos != arr.length - 1 && 
				/(close bracket)/.test(arr[pos + 1].type)) {
					indexes.push(pos);
			}
		});
		if (indexes.length) {
			errors.push({
				infix : true,
				reason : 'Empty brackets are not allowed',
				indexes
			});
		}

		// check that are not missing operators
		indexes = [];
		tokens.forEach((tok, pos, arr) => {
			if (/(number|var|close bracket)/.test(tok.type) && pos != arr.length - 1 && 
				/(number|var|open bracket)/.test(arr[pos + 1].type)) {
					indexes.push(pos);
			}
		});
		if (indexes.length) {
			errors.push({
				reason : 'Operator is missing',
				infix : true,
				indexes
			});
		}

		// check that there are no operators or closing brackets after operators
		indexes = [];
		tokens.forEach((tok, pos, arr) => {
			if (/(operator)/.test(tok.type) && pos != arr.length - 1 &&
				/(operator|close bracket)/.test(arr[pos + 1].type)) {
				indexes.push(pos);
			}
		});
		if (indexes.length) {
			errors.push({
				infix : true,
				reason : 'Should be number or variable after operator',
				indexes
			});	
		}

		// check that there are no operators after opening brackets
		indexes = [];
		tokens.forEach((tok, pos, arr) => {
			if (/(open bracket)/.test(tok.type) && pos != arr.length - 1 &&
				/(operator)/.test(arr[pos + 1].type)) {
				indexes.push(pos);
			}
		});
		if (indexes.length) {
			errors.push({
				infix : true,
				reason : 'Should be number or variable after opening bracket',
				indexes
			});	
		}

		if (errors.length) {
			return {errors, input, tokens,};
		} else {
			// fix signs ... 
			let ind = 0;
			let tokens2 = JSON.parse(JSON.stringify(tokens));
			while (ind != tokens2.length) {
				if (tokens2[ind].type == 'sign' && tokens2[ind].val == '-') {
					if (/(number|var)/.test(tokens2[ind+1].type)) {
						tokens2[ind+1].val = '-' + tokens2[ind+1].val;
					}
					if (/(open bracket)/.test(tokens2[ind+1].type)) {
						let inInd = ind+2;
						if (/(number|var)/.test(tokens2[inInd].type)) {
							tokens2[inInd].val = '-' + tokens2[inInd].val;
						}
						let brCtr = 1;
						let brInCtr = 0;
						while (brCtr > 0) {
							if (!brInCtr && /(sign|operator)/.test(tokens2[inInd].type) && /[+-]/.test(tokens[inInd].val)) {
								if (tokens2[inInd].val == '-') tokens2[inInd].val = '+';
								else if (tokens2[inInd].val == '+') tokens2[inInd].val = '-';
							}
							if (tokens2[inInd].type == 'open bracket') {
								brCtr++;
								brInCtr++;
								if (inInd == ind+2) {
									tokens2.splice(inInd, 0, {
										type : 'sign',
										val : '-',
									});
									inInd++;
								}
							}
							if (tokens2[inInd].type == 'close bracket') {
								brCtr--;
								brInCtr--;
							}
							inInd++;
						}

					}
					//remove sign...
					tokens2.splice(ind,1);
				} else ind++;
			}

			// remove tokens of type 'sign'
			tokens2 = tokens2.filter(tok => tok.type != 'sign');

			return {input, tokens :tokens2,}
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
			if (!/[a-zA-Z0-9.+\-/*()]/.test(char)) curCharType = 'unknown';

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
				case 'unknown' :
				if (curToken && curToken.type == 'unknown') {
					curToken.val += char;
				} else {
					if (curToken) tokens.push(curToken);
					curToken = {
						val : char,
						type : 'unknown',
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
				if ((pos == 0 || chars[pos-1] == '(') && /[+-]/.test(char)) {
					if (/[0-9a-zA-Z(]/.test(chars[pos+1])) {
						curToken = {
							val : char,
							type : 'sign',
							pos,
						};
						break;
					}
				}
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

module.exports = tokenizer;

