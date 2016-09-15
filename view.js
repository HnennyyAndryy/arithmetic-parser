'use strict';

let analyzeBtn = document.getElementById('analyze-btn');
let inputExpression = document.getElementById('input-expression');
let parseResult = document.getElementById('parse-result');
let parseResultSummary = document.getElementById('parse-result-summary');
let parseResultDetails = document.getElementById('parse-result-details');
let colors = ['orangered', 'royalblue', 'yellow', 'magenta', 'pink', 'darkred', 'chocolate']

analyzeBtn.addEventListener('click', e => {
	let res = tokenizer.parse(inputExpression.value);
	parseResultSummary.innerText = '';
	parseResultDetails.innerHTML = '';
	if (!res) return;
	if (!res.errors) {
		parseResultSummary.innerHTML = '<div style="text-align : center;">No errors found</div>';
		parseResultDetails.innerHTML = res.tokens.map(tok => tok.val).join('');

		let rootNode = treebuilder.build(res.tokens);
		let coords = {
			left : (window.innerWidth / 2) - 25,
			top : 0,
		}
		drawTree(rootNode, coords);
		return;
	} 
	graph.innerHTML = '';
	let tokens = res.tokens.map(tok => tok.val);
	res.errors.forEach( (err, err_i) => {
		parseResultSummary.innerHTML += `<div class='dot ${err.indexes.length ? 'bg-'+ colors[err_i] : 'bg-default'}'></div>
										 ${err_i + 1}. ${err.reason}<br>`;
		tokens = tokens.map( (val, i) => {
			if (err.infix) {
				return ~err.indexes.indexOf(i) ? `${val}<span class='${colors[err_i]}'>&UnderParenthesis;</span>` : val;
			} else {
				return ~err.indexes.indexOf(i) ? `<span class='${colors[err_i]}'>${val}</span>` : val;
			}
		});
	});
	parseResultDetails.innerHTML = tokens.join('');
});

inputExpression.addEventListener('keyup', e => {
	if (e.keyCode == 13) {
		analyzeBtn.click();
	}
});


function setIndexes (node, side, level, parentIndex) {
	node.level = level;
	node.index = side == 'left' ? parentIndex * 2 - 1 : parentIndex * 2;
	if (node.left) {
		setIndexes(node.left, 'left', level + 1, node.index);
	} 
	if (node.right) {
		setIndexes(node.right, 'right', level + 1, node.index);
	}
}
function drawTree (rootNode, coords) {
	// set vertical level and horizontal index to each node
	setIndexes(rootNode, 'left', 0, 1);

	let treeDOM = document.createElement('div');
	treeDOM.id = 'graph';
	let graph = document.getElementById('graph');
	buildTreeDOM(rootNode, null, rootNode.depth, treeDOM);
	graph.parentNode.replaceChild(treeDOM, graph);
	return 
}

function buildTreeDOM (node, opt, treeDepth, treeDOM) {
	let vertex = document.createElement('div');
	vertex.className = 'vertex';
	let left = node.index * window.innerWidth / (Math.pow(2, node.level) + 1) - 25;
	let top = node.level * 100 ;
	vertex.style.left = left + 'px';	
	vertex.style.top = top + 'px';
	vertex.innerHTML = node.val == '*' ? '&times;' : node.val;

	if (opt) {
		let edge = document.createElement('div');
		edge.className = 'edge';
		edge.style.top = opt.top + 50 + 'px';
		let width =  Math.abs(left - opt.left);
		edge.style.width = width + 'px';
		let pathDescription;
		if (opt.side == 'left') {
			edge.style.left = left + 25 + 'px';
			pathDescription = 'M0 50 L' + width + ' 0';
		} 
		if (opt.side == 'right') {
			edge.style.left = opt.left + 25 + 'px';
			pathDescription = 'M0 0 L' + width + ' 50';
		} 
		edge.style.background = `url("data:image/svg+xml;utf8,
								<svg xmlns='http://www.w3.org/2000/svg' version='1.1' 
								preserveAspectRatio='none' 
								viewBox='0 0 ${width} 50'> 
									<path 
									d='${pathDescription}' 
									fill='none' 
									stroke='grey' 
									stroke-width='0.3'/>
								</svg>")`.replace(/(\r\n|\r|\n)/g, '');

		treeDOM.appendChild(edge);
	}
	treeDOM.appendChild(vertex);
	let leftNode = node.left;
	let rightNode = node.right;
	if (leftNode) {
		buildTreeDOM(leftNode, {side : 'left', left, top}, treeDepth, treeDOM);
	}	
	if (rightNode) {
		buildTreeDOM(rightNode, {side : 'right', left, top}, treeDepth, treeDOM);
	}
}

analyzeBtn.click();