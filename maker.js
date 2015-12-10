#!/usr/bin/env node

var path = require("path");
var mkdirp = require("mkdirp");
var fs = require("fs");
var _ = require("lodash");
var execSync = require("child_process").execSync;

// ffmpeg -i "$1" -acodec libfaac -b:a 96k -vcodec mpeg4 -b:v 200k -flags +aic+mv4 "$2"
var config = {
	inputdir : fs.realpathSync("/Volumes/newmedia"),
	outputdir : fs.realpathSync("/Volumes/junkbin/mobilesync/newmedia"),
	//template: _.template("ffmpeg -i '<%=input%>' -b:a 64k -b:v 500k -acodec libfaac -vcodec mpeg4 -flags +aic+mv4 '<%=output%>'"),
	template: _.template("ffmpeg -i '<%=input%>' -b:a 128k -b:v 1000k -acodec libmp3lame -vcodec mpeg4 -flags +aic+mv4 '<%=output%>'"),
	//template: _.template("avconv -i '<%=input%>' -b:a 128k -b:v 1000k -acodec aac -strict experimental -vcodec mpeg4 -flags +aic+mv4 '<%=output%>'"),
	matchregex : /\.avi$|\.mkv$|\.mp4$|\.m4v$/i,
	timeout: 10
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

var pruneEmptyDirs = function(basedir) {
	fs.readdirSync(basedir).forEach(function(entry) {
		fullpath = path.join(basedir, entry);
		var stat = fs.statSync(fullpath);
		if(stat && stat.isDirectory()) {
			pruneEmptyDirs(fullpath);
			var deleted = true;
			try {
				// this will fail if not empty, but we want that :)
				fs.rmdirSync(fullpath);
			} catch(ex) {
				//console.log(ex);
				deleted = false;
			}
			if(deleted) {
				console.log("pruned " + fullpath + " ... done.");
			}
		}
	});
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
	var outputDeleteBasenames = _.map(walk(config.outputdir), function(filename) {
		return filename.slice(config.outputdir.length);
	});
	// outputDeleteBasenames is everything in the output directory
	outputDeleteBasenames.forEach(function(basename) {
		// strip out the '.mp4$'
		var inputWithoutExt=path.join(config.inputdir, basename).replace(/\....$/i, '');//.substring(0,-3);

		var found=false;
		candidates.forEach(function(candidateInputFilename) {
			// not very efficient... but who cares...
			var candidateInputFileWithoutExt = candidateInputFilename.replace(config.matchregex, '');
	
			//console.log("comparing " + inputWithoutExt + " with " + candidateInputFileWithoutExt);
			if(inputWithoutExt === candidateInputFileWithoutExt) {
				found=true;
			}

		});
		if(!found) {
				// output has a file that does not exist in the input
				var outputFilename = path.join(config.outputdir, basename)
				process.stdout.write("unlinking " + outputFilename + " ... ");
				fs.unlinkSync(outputFilename);
				process.stdout.write("done.\n");
		}

	});

	pruneEmptyDirs(config.outputdir);

	setTimeout(doConvertAndDelete, config.timeout * 1000);
}


process.stdout.write("newmedia-maker starting...\n");
doConvertAndDelete();
