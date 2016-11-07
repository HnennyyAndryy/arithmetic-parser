'use strict';

let treebuilder = function(){
	let priorities = {
		'-' : 0,
		'+' : 0,
		'/' : 1,
		'*' : 1,
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

	function getMinOp (tokens) {
		let minDepth = Number.MAX_SAFE_INTEGER;
		let minPos;
		tokens.forEach( (tok, pos) => {
			if (tok.type == 'operator') {
				let left = tokens[pos - 1];
				let right = tokens[pos + 1];
				let leftDepth = left.depth || 0;
				let rightDepth = right.depth || 0;
				let prevOp = getPrevOp(tokens, pos);
				let nextOp = getNextOp(tokens, pos);

				if ( 
					(prevOp && prevOp.priority > tok.priority) ||
					(nextOp && nextOp.priority > tok.priority) ||
					minDepth <= leftDepth + rightDepth
				) return;

				minDepth = leftDepth + rightDepth;
				minPos = pos;
			}
		});
		let tok = tokens[minPos];
		tok.pos = minPos;
		return tok;
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

	function getFirstGroup(tokens) {
		let openPos = -1;
		let closePos = -1;
		let ctr = 0;
		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i].type == 'open bracket') {
				ctr++;
				if (!~openPos) openPos = i;
			} 
			if (tokens[i].type == 'close bracket') {
				ctr--;
			}
			if (~openPos && ctr == 0) {
				closePos = i;
				return {openPos, closePos};
			}
		}
		return null;
	}

	function build (tokens) {
		tokens = tokens.slice().map(tok => {
			return {
				type : tok.type, 
				val : tok.val, 
				priority : priorities[tok.val],
			}
		});
		return parse(tokens);
	}

	function parse (tokens) {
		let group;
		while (group = getFirstGroup(tokens)) {
			let node = parse(tokens.slice(group.openPos + 1, group.closePos));
			tokens.splice(group.openPos, group.closePos - group.openPos + 1, node);
		}

		while (tokens.length > 1) {
			let op = getMinOp(tokens);
			let prevOp = getPrevOp(tokens, op.pos);
			
			if (prevOp && /(\-|\/)/.test(prevOp.val)) {
				op.val = inverseOp[prevOp.val][op.val];
			}

			let leftNode = tokens[op.pos - 1];
			let rightNode = tokens[op.pos + 1];
			leftNode.depth = leftNode.depth || 0;
			rightNode.depth = rightNode.depth || 0;
			op.left = leftNode;
			op.right = rightNode;
			op.depth = Math.max(leftNode.depth, rightNode.depth) + 1;
			op.type = 'node';
			tokens.splice(op.pos - 1, 3, op);
		}
		// terminal node
		return tokens[0];
	}

	return {
		build
	}
}();

module.exports = treebuilder;