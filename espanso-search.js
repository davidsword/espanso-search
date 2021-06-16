#!/usr/bin/env node

const Fuse = require('fuse.js')
const inquirer = require('inquirer')
const clipboardy = require('clipboardy')
const cliTruncate = require('cli-truncate')
const chalk = require("chalk");
const cmd = require('node-cmd')

//@TODO --help page

;(() => {
	// @TODO `/usr/bin/` might not be the case for everyone.
	const espansoMatchesJSON = cmd.runSync('/usr/bin/espanso match list -j');
	// @TODO check if returned data properly before use
	espansoMatches = JSON.parse( espansoMatchesJSON.data )

	// convert `triggers` to `trigger` for eaiser searching
	// @TODO probably can configure fuse.js to look at the array, this may cause issue if querying an additional trigger
	espansoMatches.forEach((match, i) => {
		espansoMatches[i].trigger = espansoMatches[i].triggers[0]
	})

	// search query
	const query = process.argv.slice(2).join(' ')
	if (query === '') {
		console.log( chalk.red.bold( 'query required! Eg `$ esp hello`' ) )
		return
	}
	const fuseSearch = new Fuse(espansoMatches, {
		keys: [
			"trigger",
			"replace"
		],
		threshold: 0.25 // @TODO this threshold should be up to the user
	})
	const queryResults = fuseSearch.search(query)

	// find longest trigger to create a column for the trigger
	// @TODO there should be a max length for extreme use cases
	let maxLength = 0;
	queryResults.forEach((result) => {
		maxLength = result.item.trigger.length > maxLength ? result.item.trigger.length : maxLength;
	})

	// first result is a way to eaisily bail and retry a query
	const resultsToOutput = [{
		name: '.exit',
		value: '.exit'
	}]

	queryResults.forEach((result) => {
		let triggerLengthDiff = maxLength - result.item.trigger.length;
		let triggerLengthPadding = '   ';
		if ( triggerLengthDiff > 0 ) {
			i = 0;
			while (i < triggerLengthDiff) {
				triggerLengthPadding += ' '
				i++;
			}
		}
		resultsToOutput.push({
			name: result.item.trigger + triggerLengthPadding + cliTruncate(result.item.replace, 40).trim().replace(/\n|\r/g, ""),
			value: result.item.replace
		});
	})

	inquirer
		.prompt([{
			type: 'list',
			name: 'snippet',
			message: 'Select Espanso Match:\n',
			choices: resultsToOutput
		}])
		.then(function (theChosenOne) {
			if (theChosenOne.snippet === '.exit') {
				return //silently
			}
			clipboardy.writeSync(theChosenOne.snippet)
			console.log( chalk.green.bold( 'Value copied to clipboard!' ) )
		})

})()