//this one opens tabs as directed by the extension
chrome.browserAction.onClicked.addListener(function(){
                chrome.tabs.create({url: 'index.html'})
      }
);