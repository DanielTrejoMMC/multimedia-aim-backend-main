const fs = require("fs");
const readline = require('readline');
const randomstring = require("randomstring");
const readLastLines = require('read-last-lines');
const _fileStore = async (file, newFileFolder = "upload") => {
	try {
		const regex = /[^.]*/;
		const data = fs.readFileSync(file.path);
		const fileName = file.name.replace(regex, randomstring.generate());
		const filePath = newFileFolder;
		if (!fs.existsSync(`./public/${filePath}`)) {
			fs.mkdirSync(`./public/${filePath}`, {
				recursive: true
			})
		}
		fs.writeFileSync(`./public/${filePath}/${fileName}`, data);
		fs.unlinkSync(file.path);
		return Promise.resolve(`/${filePath}/${fileName}`);
	} catch (error) {
		console.log(error)
		return Promise.reject(error);
	}
}

const _fileDelete = async (filePath) => {
	try {
		if (fs.existsSync(`./public/${filePath}`))
			fs.unlinkSync(`./public/${filePath}`);
		return Promise.resolve(true);
	} catch (error) {
		return Promise.reject(error);
	}
}

const _fixFile = async (path) => {
  try {
    console.log(path)
    const line = await readLastLines.read(`./public/${path}`, 1)
    if (line.indexOf('</billing-log>') < 0) {
      fs.appendFileSync(`./public/${path}`, '</billing-log>')
    }
  } catch (e) {
    console.log(e)
    return Promise.reject(e)
  }
}

module.exports = {
	fileStore: _fileStore,
	fileDelete: _fileDelete,
  fixFile: _fixFile
};
