# Geo

Calculates all possible combinations of line segments and shows the distances of points from each. You can view a demo of this working here:
http://kmturley.github.io/geo/

Instructions for use:

 * In Google Earth right-click a folder that contains placemarks and choose 'Save As'
 * Ensure you change the save option to be .kml and save the file somewhere on your computer
 * Open Geo index.html in your browser to show the start screen
 * Now open the kml file you previously saved in a plain text editor such as Notepad
 * Copy and paste the source code into the Geo textarea, making sure there are no spaces around the code.
 * Enter a max distance the points are allowed to be from the line to register as a valid line (set this higher to start with)
 * Enter a minimum number of points the line should contain (Every line has two points already start/finish so put 3 or more)
 * Click 'Load Results' to start the script running
 
Problem solving:

 * Avoid having too many points as it slows down the browser
 * Ensure there isn't any space around the source code because this prevents the xml from being read
 
Obtaining kml files:

Some useful links to generate kml files automatically for you:

 * http://toolserver.org/~para/cgi-bin/kmlexport?article=paste_wikipedia_article_url_here
 * http://www.megalithic.co.uk/
 * http://earthquake.usgs.gov/earthquakes/search/