const parseDiff = require('parse-diff')
const core = require('@actions/core')
const fs = require('fs')
const { inspect } = require('util')
const { exec } = require('child_process')
const { parse } = require('toml')

;(async () => {
	// fetch the tomls from the config
	let toml = core.getInput('toml') || 'core/Cargo.toml ipc/Cargo.toml'

	// compare the specified toml files with the previous commit (HEAD-1)
	// to know if it's change
	console.log("current directory: ", process.cwd())
	let data = await new Promise(resolve => {
		exec(`git diff HEAD^ HEAD -- ${toml}`, async (error, stdout, stderr) => {
			if (error) {
				console.error('error:', error)
			}
			if (stderr) {
				console.error('stderr:', stderr)
			}
			resolve(stdout)
		})
	})

	// parse the diff
	let diff = parseDiff(data)

	for (const file of diff) {
		// check if the version was changed.
		// TODO: in an ideal scenario
		// we'd check if the version number increased
		const version_changed = file.chunks.some(chunk =>
			chunk.changes.some(change => change.content.includes('version'))
		)

		if (!version_changed) {
			continue
		}

		const paths = file.to.split('/')

		let folder
		if (paths.length > 1) {
			folder = paths[paths.length - 2]
		} else {
			folder = paths[paths.length - 1]
		}

		const crate = parse(await fs.readFileSync(file.to))
		console.log('Publishing crate: ', crate.package.name)

		await new Promise(resolve => {
			exec(`cd ${folder} && cargo publish`, (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`)
					return resolve()
				}
				if (stderr) {
					console.error(`stderr: ${stderr}`)
				}
				if (stdout) {
					console.log(`stdout: ${stdout}`)
				}
				resolve()
			})
		})
	}

	process.exit()
})()
