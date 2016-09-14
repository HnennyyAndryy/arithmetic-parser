'use strict';

let analyzeBtn = document.getElementById('analyze-btn');
let inputExpression = document.getElementById('input-expression');
let parseResult = document.getElementById('parse-result');
let parseResultSummary = document.getElementById('parse-result-summary');
let parseResultDetails = document.getElementById('parse-result-details');

analyzeBtn.addEventListener('click', e => {
	let res = tokenizer.parse(inputExpression.value);
	parseResultSummary.innerText = '';
	parseResultDetails.innerHTML = '';
	if (!res) return;
	if (!res.error) {
		parseResultSummary.innerText = 'No errors found';
	} else {
		let data;
		parseResultSummary.innerText = res.reason;
		if (!res.tokens) {
			data = res.chars.map( (ch, i) => {
				return ~res.indexes.indexOf(i) ? `<span class='error'>${ch}</span>` : ch;
			});
		} else {
			data = res.tokens.map( (tok, i) => {
				return ~res.indexes.indexOf(i) ? `<span class='error'>${tok.val}</span>` : tok.val;
			});
		}
		parseResultDetails.innerHTML = data.join('');
	}

});

inputExpression.addEventListener('keyup', e => {
	if (e.keyCode == 13) {
		analyzeBtn.click();
	}
});
