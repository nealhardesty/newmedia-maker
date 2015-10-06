#!/usr/bin/env node

var path = require("path");
var mkdirp = require("mkdirp");
var fs = require("fs");
var _ = require("lodash");
var execSync = require("child_process").execSync;

// ffmpeg -i "$1" -acodec libfaac -b:a 64k -vcodec mpeg4 -b:v 200k -flags +aic+mv4 "$2"
var config = {
	inputdir : fs.realpathSync("/Volumes/newmedia"),
	outputdir : fs.realpathSync("/Volumes/junkbin/mobilesync/newmedia"),
	template: _.template("ffmpeg -i '<%=input%>' -b:a 64k -b:v 400k -acodec libfaac -vcodec mpeg4 -flags +aic+mv4 '<%=output%>'"),
	matchregex : /\.avi$|\.mkv$|\.mp4$|\.m4v$/i,
	timeout: 60
};

var walk = function(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir , file);
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) 
					results = results.concat(walk(file));
        else {
					results.push(fs.realpathSync(file));
				}
    })
    return results;
}

var exists = function(filename) {
	try {
		fs.statSync(filename);
		return true;
	} catch (e) {
		return false;
	}
}

var convert = function(title, input, output) {
	var dirname=path.dirname(output);
	mkdirp.sync(dirname);
	var command=config.template({'input':input, 'output':output});
	process.stdout.write("converting " + title + " ... ");
	execSync(command, {stdio: [null, null]});
	process.stdout.write("done.\n");
}

var doConvertAndDelete = function() {
	var candidates = _.filter(walk(config.inputdir), function(item) {
		return config.matchregex.test(item);
	});;

	var basenames = _.map(candidates, function(filename) {
		return filename.slice(config.inputdir.length);
	});

	// --- conversion step
	basenames.forEach(function(basename) {
		var output=path.join(config.outputdir, basename).replace(config.matchregex, ".mp4");
		var input=path.join(config.inputdir, basename);
		if(!exists(output))  {
			convert(basename, input, output);
		} 
	});

	//  --- deletion step
	/*
	var outputDeleteCandidates = walk(config.outputdir);
	var outputDeleteBasenames = _.map(outputDeleteCandidates, function(filename) {
		return filename.slice(config.outputdir.length);
	});
	basenames.forEach(function(basename) {
		var output=path.join(config.outputdir, basename).replace(config.matchregex, ".mp4");
		var input=path.join(config.inputdir, basename);

	});
	*/

	setTimeout(doConvertAndDelete, config.timeout * 1000);
}


process.stdout.write("newmedia-maker starting...\n");
doConvertAndDelete();
