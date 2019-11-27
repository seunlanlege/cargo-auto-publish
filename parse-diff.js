const parseDiff = require('parse-diff')
const getStdin = require('get-stdin')
const { inspect } = require('util')
const { exec } = require('child_process')

;(async () => {
	let data = await getStdin()
	let diff = parseDiff(data)

	for (const file of diff) {
		const version_changed = file.chunks.map(chunk =>
			chunk.changes.map(change => change.content.includes('version'))
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

		exec(`cd ${folder} && cargo publish`, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`)
				return
			}
			console.log(`stdout: ${stdout}`)
			console.error(`stderr: ${stderr}`)
		})
	}
})()
