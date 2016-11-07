'use strict';

let accum;
let equiv = function(){
	let priorities = {
		'-' : 0,
		'+' : 0,
		'/' : 1,
		'*' : 1,
	}

	let multSigns = {
		'--' : '+',
		'-+' : '-',
		'+-' : '-',
		'++' : '+',
	}

	let inverseOp = {
		'-' : {
			'-' : '+',
			'+' : '-',
			'*' : '*',
			'/' : '/',
		},
		'/' : {
			'-' : '-',
			'+' : '+',
			'*' : '/',
			'/' : '*',	
		}
	}

	function getPrevOp(tokens, pos) {
		for (let i = pos - 1; i >= 0; i--) {
			if (tokens[i].type == 'operator') return tokens[i];
		}
		return null;
	}

	function getNextOp(tokens, pos) {
		for (let i = pos + 1; i < tokens.length; i++) {
			if (tokens[i].type == 'operator') return tokens[i];
		}
		return null;
	}

	function getFirstGroup(tokens, start) {
		let openPos = -1;
		let closePos = -1;
		let ctr = 0;
		for (let i = start || 0; i < tokens.length; i++) {
			if (tokens[i].type == 'open bracket') {
				ctr++;
				if (!~openPos) openPos = i;
			} 
			if (~openPos && tokens[i].type == 'close bracket') {
				ctr--;
			}
			if (~openPos && ctr == 0) {
				closePos = i;
				return {openPos, closePos};
			}
		}
		return null;
	}

	function getTermBefore (tokens, start) {
		let startPos = start;
		let endPost = 1;
		let term = [tokens[start]];
		for (let i = start - 1; i >= 0; i--) {
			if (
				/(open bracket|close bracket)/.test(tokens[i].type) ||
				(/(sign|operator)/.test(tokens[i].type) && /[+-]/.test(tokens[i].val))
				) return {term : term.reverse(), sign : /(sign|operator)/.test(tokens[i].type) ? tokens[i].val : null};
			term.push(tokens[i]);
		}
		return { term : term.reverse() };
	}

	function getTermAfter (tokens, start, splitMultDev) {
		let startPos = start;
		let term = [tokens[start]];

		// counter for inner brackets
		let inBr = tokens[start].type == 'open bracket';
		let brCtr = inBr ? 1 : 0;

		for (let i = start + 1; i < tokens.length; i++) {
			if (tokens[i].type == 'sign') {
				// wtf
			}

			if (tokens[i].type == 'open bracket') {
				brCtr++;
				inBr = true;
			}
			if ( !inBr && 
					(
					/(close bracket)/.test(tokens[i].type) ||
					(tokens[i].type == 'operator' && /[+-]/.test(tokens[i].val)) ||
					(splitMultDev && /[/*]/.test(tokens[i].val))
					)
				) return term;
			if (tokens[i].type == 'close bracket') {
				brCtr--;
				if (brCtr == 0) inBr = false;
			}
			

			term.push(tokens[i]);
		}
		return term;
	}

	function openBrackets (tokens) {
		tokens = tokens.map(tok => {
			return {
				type : tok.type, 
				val : tok.val, 
				priority : priorities[tok.val],
			}
		});		

		// some preparation
		// replace ()/()/()/() by ()/(()*()*())
		let killingSpree = false;
		let start;
		let kills = 0;
		let brCtr;
		//console.log('PREPARE');
		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i].type == 'operator') {
				if (tokens[i].val == '/') {
					if (!killingSpree) {
						//console.log('STARTING KILLING SPREE AT:'+i);
						killingSpree = true;
						brCtr = 0;
						kills = 0;
						start = i + 1;
						continue;
					}
				}
				if (killingSpree) {
					if (tokens[i].val == '/') {
						//console.log('replace');
						tokens[i].val = '*';
						//print(tokens);
						kills++;
					} else if (brCtr == 0 && kills > 0){
						//console.log('END KILLING SPREE AT:'+i);
						killingSpree = false;
						//console.log('kills:'+kills);
						//console.log('before');
						//print(tokens);
						tokens.splice(start, i - start, 
							{
								type: 'open bracket',
								val: '('
							},
							tokens.slice(start, i),
							{
								type: 'close bracket',
								val: ')'
							}
						);
						//console.log('after');
						//print(tokens);
					} else if (brCtr == 0 && kills == 0) {
						killingSpree = false;
					}
				}
			} 

			if (killingSpree && tokens[i].type == 'open bracket') {
				brCtr++;
			}
			if (killingSpree && tokens[i].type == 'close bracket') {
				brCtr--;
			}
			if ((killingSpree && kills > 0) &&
				(
					(tokens[i].type == 'close bracket' && brCtr == -1) ||
					(i == tokens.length - 1)

				)
			) {
				killingSpree = false;
				Array.prototype.splice.apply(tokens, [start, i - start + 1, 
					{
						type: 'open bracket',
						val: '('
					}].
					concat(tokens.slice(start, i + 1))
					.concat([
					{
						type: 'close bracket',
						val: ')'
					}])
				);
			}
		}
		//console.log('AFTER PREPARATION:');
		//print(tokens);
		accum = [];
		let res = _openBrackets(tokens);

		//console.log('BEFORE FINAL FIXES');
		//print(res);

		// check first sign - crutch
		if (res[0].val == '-') {
			res[1].val = '-' + res[1].val;
			res.shift();
		}
		res = res.filter(tok => tok.type != 'sign');
		// clean pluses on beginning
		while (/(operator|sign)/.test(res[0].type) && res[0].val == '+') res.shift();
		// clean pluses after open brackets
		for (let i = 1; i < res.length; i++) {
			if (res[i].val == '+' && res[i-1].type == 'open bracket') {
				res.splice(i, 1);
				i--;
			}
		}
		// clean brackets in case (a) or (1)
		for (let i = 1; i < res.length - 1; i++) {

			if ((res[i].type == 'number' || res[i].type == 'var') && 
				res[i-1].type == 'open bracket' && res[i+1].type == 'close bracket') {
				res.splice(i-1, 3, res[i]);
				i -= 2;
			}
		}

		console.log('FINAL RESULT');
		
		print(res);
		return {tokens: res};
	}

	function _openBrackets(tokens) {
		let group, brStart, brEnd;

		// put sign in beginning 
		if (!/(sign|operator)/.test(tokens[0].type)) {
			let sign = {type : 'sign'};
			if (/(number|var)/.test(tokens[0].type)) {
				let tokSign = tokens[0].val.split('')[0];
				if (/[-+]/.test(tokSign)) {
					sign.val = tokSign;
					tokens[0].val = tokens[0].val.substr(1);
				} else {
					sign.val = '+';
				}
			} else {
				sign.val = '+';
			}
			sign.priority = priorities[sign.val];
			tokens.unshift(sign);
		}

		let index = 0;
		while (group = getFirstGroup(tokens, index)) {
			//console.log('GROUP');
			//console.log(group);
			//console.log('AND TOKENS ARE:');
			print(tokens);
			accum.push(JSON.parse(JSON.stringify(tokens)));
			brStart = group.openPos;
			brEnd = group.closePos;

			// go inside....
			let nodes;
			try {
			nodes = _openBrackets(tokens.slice(brStart + 1, brEnd));
				
			}
			catch (fe) {
				debugger;
			}
			
			/* 
			1. after we reach the innermost brackets, tokens.slice(brStart + 1, brEnd) 
				is returned
			2. transformed expression is returned - replace old one
			*/
			if (nodes) {
				if (brStart != 0) {
					nodes[0].type = 'operator';
				} else {
				}
			
				Array.prototype.splice.apply(tokens, [brStart + 1, brEnd - brStart - 1].concat(nodes))
			
				// update positions
				group = getFirstGroup(tokens, brStart);
				brStart = group.openPos;
				brEnd = group.closePos;

			}


			let operator = tokens[brStart - 1];
			
			// case a * (...)
			if (operator && /[*]/.test(operator.val)) {
				// term before 
				var multiplier = getTermBefore(tokens, brStart - 2);
				
				let multiplication = mult(tokens.slice(brStart + 1, brEnd), 
					multiplier.term, 
					multiplier.sign || '+', 
					operator, true);
				
				// delete '<sign> a <operator>'
				// put '+' in front of brackets
				// replace old expressiong with multiplication result
				//console.log('BEFORE MULT');
				//print(tokens);
				//console.log('MULT RES')
				//print(multiplication);
				Array.prototype.splice.apply(tokens, [brStart - multiplier.term.length - 2, 
					multiplier.term.length + 2 + (brEnd-brStart+1), 
					{
						type: 'operator',
						val: '+',
						priority: 0
					},
					{
						type: 'open bracket',
						val: '(',
					}].concat(multiplication).
					concat([
					{
						type: 'close bracket',
						val: ')',
					}])
				);
				//console.log('AFTER MULT');
				//print(tokens);
				continue;
			}

			// check cases (a+b)*c and (a+b)*(d+e)
			if (!operator || // impossible
				/[-+]/.test(operator.val)) {
				
				// check case (a+b)/(c+d)
				if (brEnd < tokens.length - 1 &&
					tokens[brEnd + 1].type == 'operator' && 
					/[/]/.test(tokens[brEnd + 1].val)) {
					//console.log('See / after position : ' + brEnd);
					
					let divider = getTermAfter(tokens, brEnd + 2, true);
					let dividerCopy = JSON.parse(JSON.stringify(divider));
					//console.log('DIVIDER:');
					//print(divider);
					let division = divBrackets(tokens.slice(brStart + 1, brEnd), 
							dividerCopy);
					//console.log('division result:');
					//print(division);
					Array.prototype.splice.apply(tokens, [brStart + 1, 
						brEnd - brStart + divider.length + 1].concat(division)
						.concat([
							{
								type: 'close bracket',
								val: ')'
							}
						]) 
					);
					//console.log('DIVISION AFTER SLICE');
					//print(tokens);
					index = brStart + division.length + 2;
					//console.log('SIGN AFTER DIV:');
					//console.log(tokens[index]);
					if (tokens[index] && tokens[index].val == '/') {
						//console.log('SHOULD GO BACK');
						index = brStart;
						//console.log('NEW BR START:');
						//console.log(brStart);
					}
					index = brStart;
					continue;
				}
				if (brEnd < tokens.length - 1 &&
					tokens[brEnd + 1].type == 'operator' && 
					/[*]/.test(tokens[brEnd + 1].val)) {
					// check what is next multiplier
					let nextMult = tokens[brEnd + 2];
					if (/(number|var)/.test(nextMult.type)) {
						let multiplication = mult(tokens.slice(brStart + 1, brEnd), 
							[nextMult], 
							'+', 
							tokens[brEnd + 1], false);
						
						// replace old expressiong with multiplication result
						// delete following operator and multiplier
						Array.prototype.splice.apply(tokens, [
							brStart + 1, (brEnd-brStart) + 2, 
						].concat(multiplication).concat([
							{
								type: 'close bracket',
								val: ')',
							}
						])
						);
						continue;

					} 
					if (nextMult.type == 'open bracket' && tokens[brEnd + 1].val == '*') {
						let nextBr = getFirstGroup(tokens, brEnd + 1);
						let multiplication = multBrackets(tokens.slice(brStart + 1, brEnd), 
							tokens.slice(nextBr.openPos + 1, 
							nextBr.closePos), tokens[brEnd + 1])
						Array.prototype.splice.apply(tokens, [
							brStart + 1, nextBr.closePos - brStart
						].concat(multiplication).concat([
							{
								type: 'close bracket',
								val: ')'
							}
						])
						)
						continue;
					}
				} else {
					// case +()
					// just delete brackets
					if (operator.val == '+') {
						tokens.splice(brStart - 1, 2);
						tokens.splice(brEnd - 2, 1);
					}

					// case -()
					// inverse signs and delete brackets
					if (operator.val == '-') {
						for (let i = brStart; i < brEnd; i++) {
							if (/(sign|operator)/.test(tokens[i].type)) 
								tokens[i].val = inverseOp['-'][tokens[i].val];
						}
						tokens.splice(brStart - 1, 2);
						tokens.splice(brEnd - 2, 1);	
					}
				}
			}

			if (operator && /[/]/.test(operator.val)) {
				index = brEnd + 1;
				//console.log('SEE / before while analizing:');
				//print(nodes);
			}

			if (!operator) alert('no operator');

			}

		return tokens;
	}

	function mult(tokens, multVal, multSign, operator, multFirst) {
		let res = [];
		let termInBrackets;
		// start position
		let pos = 1;
		while ((pos < tokens.length) && 
			(termInBrackets = getTermAfter(tokens, pos))) {
			
			let resultSign = {type: 'operator'};
			resultSign.val = multSigns[multSign + tokens[pos - 1].val];
			resultSign.priority = priorities[resultSign.val];
				
			// copy term
			let term = JSON.parse(JSON.stringify(multVal));
			// put sign and term into array of tokens	
			if (multFirst) {
				Array.prototype.push.apply(res, [resultSign].concat(term).concat([operator]).concat(termInBrackets));
			} else {
				Array.prototype.push.apply(res, [resultSign].concat(termInBrackets).concat([operator]).concat(term));
			}
			pos += termInBrackets.length + 1;	
		}
		return res;
	}

	function multBrackets(tokens1, tokens2, operator) {
		let res = [];
		tokens2 = _openBrackets(tokens2);
		let term;
		let pos = 1;
		while ((pos < tokens1.length) && 
			(term = getTermAfter(tokens1, pos))) {
			Array.prototype.push.apply(res, mult(tokens2, term, tokens1[pos-1].val, operator, true));
			pos += term.length + 1;	
		}
		return res;
	}

	function divBrackets(tokens1, tokens2) {
		let operator = {
			type: 'operator',
			val: '/',
			priority: 1,
		}
		//console.log('BRACKETS DIVISION');
		//console.log('BR 1');
		//print(tokens1);
		//console.log('BR 2');
		//print(tokens2);
		let res = [];
		tokens2 = _openBrackets(tokens2);
		let term;
		let pos = 1;
		while ((pos < tokens1.length) && 
			(term = getTermAfter(tokens1, pos))) {

			//console.log('NEXT TERM TO DIVIDE');
			//print(term);
			let resultSign = {type: 'operator'};
			resultSign.val = tokens1[pos - 1].val;
			resultSign.priority = priorities[resultSign.val];
			
			Array.prototype.push.apply(res, [resultSign].concat(term).concat([operator]).concat([
				{
					type: 'open bracket',
					val: '('
				}
				])
				.concat(tokens2).concat([
				{
					type: 'close bracket',
					val: ')'				
				}
				])
			);	
			pos += term.length + 1;	
		}
		return res;
	}

	function countUpLevelBrackets (tokens) {
		let ctr = 0;
		let mainCtr = 0;
		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i].type == 'open bracket') {
				ctr++;
			} 
			if (tokens[i].type == 'close bracket') {
				ctr--;
				if (ctr == 0) {
					mainCtr++;
				}
			}
		}
		return mainCtr;
	}

	function countUndividableBrackets (tokens) {

	}

	function print (tokens) {
		let simplified = tokens.map(tok => tok.val);
		console.log(simplified.join(''));
	}

	return {
		openBrackets
	}
}();

module.exports = equiv;