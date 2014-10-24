# Houndstooth

Click the void to create one
Click one to delete it.
Drag one to move it.

* Box2D calculates positions based on a Vector representation of the pattern (ToothDef.js)
* PIXI draws a bitmap at the calculated positions
* Needs to be run on a (local) server (CORS-restrictions)
* FPS counter can be enabled in Main.js:60
* Physics properties of the patterns in Main.js:311

## Editor Initialisation 

`palette` argument differs from other editors, needs to be a 2 item array:
The first item is the background color as an 8bit rgb array
The second item is the url of the houdstooth image to use, e.g.

`[[221, 221, 221], 'assets/tooth.png']`
