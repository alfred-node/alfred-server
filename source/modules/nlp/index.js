var natural = require("natural");
var htmlparser = require("htmlparser2");
var path = require("path");


module.exports = app => {
	
	var base_folder = path.join(path.dirname(require.resolve("natural")), "brill_pos_tagger");
	var rulesFilename = base_folder + "/data/English/tr_from_posjs.txt";
	var lexiconFilename = base_folder + "/data/English/lexicon_from_posjs.json";
	var defaultCategory = 'N';
	
	var lexicon = new natural.Lexicon(lexiconFilename, defaultCategory);
	var rules = new natural.RuleSet(rulesFilename);
	var tagger = new natural.BrillPOSTagger(lexicon, rules);
	var tokenizer = new natural.WordTokenizer();
	
	app.speechTag = phrase => {
		
		if(phrase == null){
			phrase = '';
		}
		
		// Tidy it up a bit first:
		phrase = phrase.trim();
		
		// If it's surrounded with <p> just insta drop that:
		if(phrase.startsWith('<p>') && phrase.endsWith('</p>')){
			// chop them off:
			phrase = phrase.substring(3, phrase.length - 4);
		}
		
		// First we treat it like HTML:
		var document = {
			childNodes: []
		};
		var currentElement = document;
		
		var parserOptions = {
			onopentag: function(name, attribs){
				var newEle = {
					name,
					attributes: attribs,
					childNodes: []
				};
				
				currentElement.childNodes.push(newEle);
				newEle.parentNode = currentElement;
				currentElement = newEle;
			},
			ontext: function(text){
				// Tokenise text now:
				var words = tokenizer.tokenize(text);
				
				var posTagged = tagger.tag(words).taggedWords;
				
				for(var i=0;i<posTagged.length;i++){
					var tagged = posTagged[i];
					tagged.tokenLC = tagged.token.toLowerCase();
					tagged.stem = natural.PorterStemmer.stem(tagged.token);
				}
				
				currentElement.childNodes.push({
					words: posTagged
				});
			},
			onclosetag: function(tagname){
				if(currentElement.parent == null){
					// Inbalanced tags
					return;
				}
				currentElement = currentElement.parent;
			}
		};
		
		var parser = new htmlparser.Parser(parserOptions, {decodeEntities: true});
		parser.write(phrase);
		parser.end();
		// TODO: english->numeric (two hundred => 200)
		
		return document;
	}
	
	/*
	* Active conversations.
	*/
	var conversations = [];
	
	app.startConversation = (initialContext) => {
		
		/*
		Starts a new conversation context.
		These can be really long running (like an email chain) so must be DB/ brain backed.
		initialContext contains, at a minimum, withPeople: an array of people ref's to establish who else is (probably) here.
		It comes from recognising the email address/ caller ID etc.
		If it's empty, Alfred will try and establish who he's talking to if he needs to.
		*/
		
		var conversation = {
			context: initialContext,
			addMessage: msg => {
				
				// Extract some meaning from this message.
				var message = app.speechTag(msg);
				
				// English is very redundant - there's a lot of repeated context that we need to ignore.
				// Essentially convert fluffy phrases to command-like ones.
				// (They won't always be direct commands though of course).
				// "Hey Alfred, could you setup a server for me please" => "setup server"
				
				// [Alfred] "Do you see a red and blue pill?"
				// [Person] "Yeah"
				
				
			}
		};
		
		conversations.push(conversation);
		return conversation;
		
	}
	
	app.learnEnglishWords = (words, firstConceptId) => {
		
		// Note that words are just words.
		// They do not have a relationship with an actual "thing" until that "resolves to" relation is learned too.
		
		app.learn(words.map(word => {
			
			var letters = [];
			var letterStr = 1/word.length;
			
			for(var i=0;i<word.length;i++){
				letters.push({
					id: word.charCodeAt(i),
					strength: letterStr
				});
			}
			
			return {
				id: firstConceptId++,
				is: [{id: 1500006, strength: 1}],
				containedBy: [{id: 1500007, strength: 1}], // Strength only drops when the word is used by some other language as well.
				contains: letters
			};
			
		}));
		
		app.learn([concept]);
	}
	
	app.learn = (concepts, inContext) => {
		inContext = inContext || 0;
		
		// concept.isA. This relationship is a variant of another concept.
		// concept.contains. Things that this concept contains.
		// concept.containedBy. Relationships running the other way.
		// concept.resolvesTo. E.g. the _word_ "dog" resolves to the thing that is a certain type of animal.
		
		var relations = '';
		
		for(var i=0;i<concepts.length;i++){
			var concept = concepts[i];
			
			if(concept.resolvesTo){
				for(var x=0;x<concept.resolvesTo.length;x++){
					var _cb = concept.resolvesTo[x];
					if(relations != ''){
						relations += ',';
					}
					relations += '(' + concept.id + ', ' + _cb.id  + ', ' + _cb.strength + ', 3, ' + inContext + ')';
				}
			}
			
			if(concept.is){
				for(var x=0;x<concept.is.length;x++){
					var _is = concept.is[x];
					if(relations != ''){
						relations += ',';
					}
					relations += '(' + concept.id + ', ' + _is.id  + ', ' + _is.strength + ', 2, ' + inContext + ')';
				}
			}
			
			if(concept.containedBy){
				for(var x=0;x<concept.containedBy.length;x++){
					var _cb = concept.containedBy[x];
					if(relations != ''){
						relations += ',';
					}
					relations += '(' + concept.id + ', ' + _cb.id  + ', ' + _cb.strength + ', 1, ' + inContext + ')';
				}
			}
			
			if(concept.contains){
				for(var x=0;x<concept.containedBy.length;x++){
					var _cb = concept.containedBy[x];
					if(relations != ''){
						relations += ',';
					}
					relations += '(' + _cb.id + ', ' + concept.id  + ', ' + _cb.strength + ', 1, ' + inContext + ')';
				}
			}
			
		}
		
		app.database.query('insert into ai_relations (`from_concept`, `to_concept`, `strength`, `type`, `context`) values ' + relations, null, (err, result) => {
			
			if(err){
				console.log(err);
				return;
			}
			
			cosole.log("Alfred learnt something!");
			
		});
		
	}
	
}