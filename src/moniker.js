/*jshint plusplus: false, passfail: true, browser: true, devel: true, indent: 4,
maxlen: 80, -W097, unused: true*/

//Having to type 'Box2D.' in front of everything makes porting
//existing C++ code a pain in the butt. This function can be used
//to make everything in the Box2D namespace available without
//needing to do that.

function using(ns, pattern) {
    if (typeof(pattern) == 'string') {
        pattern = new RegExp(pattern);
    }
    // import only stuff matching given pattern
    for (var name in ns) {
        if (name.match(pattern)) {
            this[name] = ns[name];
        }
    }
}

using(Box2D, "b2.+");

var monikerEditor = function(_width, _height, _pallette, _rotate, callback) {
    var that = {},
        rotate = rotate || false,
        pallette, ui;

    var STAGE_WIDTH = _width,
        STAGE_HEIGHT = _height;
    var METER = 100;

    var bodies = [],
        actors = [];
    var stage, renderer;
    var world, mouseJoint;
    var touchX, touchY;
    var isBegin, wasMoved;
    var stats;
    var myQueryCallback;
    var mouseJointGroundBody;

    var polyFixture, bodyDef;

    var stack = true;

    var originalToothSize = 270;
    var teethInRow = 15;
    var toothSpacing = 2;

    var usableWidth = STAGE_WIDTH - (teethInRow - 1) * toothSpacing;
    // A row of n teeth needs 1*toothSize + (n-1) * toothSize * 0.8 space
    var toothSize = usableWidth / (1 + (teethInRow - 1) * 0.8);

    var toothScale = toothSize/originalToothSize;

    (function init() {
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = (function() {
                return window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    function(callback) {
                        window.setTimeout(callback, 1000 / 60);
                    };
            })();
        }

        window.onload = onLoad;
    })();

    function onLoad() {
        var container = document.createElement("div");
        document.body.appendChild(container);

        stats = new Stats();
        // Enable or disable stats here
        //container.appendChild(stats.domElement);
        stats.domElement.style.position = "absolute";

        stage = new PIXI.Stage(0xDDDDDD, true);

        renderer = PIXI.autoDetectRenderer(STAGE_WIDTH, STAGE_HEIGHT, undefined, false);
        document.body.appendChild(renderer.view);

        scaleParts(parts);

        var loader = new PIXI.AssetLoader(["assets/tooth.png"]);

        loader.onComplete = onLoadAssets;
        loader.load();
    }

    function onLoadAssets() {
        world = new Box2D.b2World(new Box2D.b2Vec2(0, 0), true);
        mouseJointGroundBody = world.CreateBody(new b2BodyDef());
        world.SetContinuousPhysics(true);

        polyFixture = new Box2D.b2FixtureDef();
        var shape = new Box2D.b2PolygonShape();
        polyFixture.set_shape(shape);
        polyFixture.set_density(1);

        bodyDef = new Box2D.b2BodyDef();

        //down
        shape.SetAsBox(10, 1);
        bodyDef.get_position().Set(9, STAGE_HEIGHT / METER + 1);
        world.CreateBody(bodyDef).CreateFixture(polyFixture);

        //left wall
        shape.SetAsBox(1, 100);
        bodyDef.get_position().Set(-1 - toothSize/METER, 0);
        world.CreateBody(bodyDef).CreateFixture(polyFixture);

        //right wall
        bodyDef.get_position().Set((STAGE_WIDTH + toothSize) / METER + 1, 0);
        world.CreateBody(bodyDef).CreateFixture(polyFixture);

        bodyDef.set_type(Box2D.b2_dynamicBody);

        preStack();

        myQueryCallback = new b2QueryCallback();

        Box2D.customizeVTable(myQueryCallback, [{
            original: Box2D.b2QueryCallback.prototype.ReportFixture,
            replacement: function(thsPtr, fixturePtr) {
                var ths = Box2D.wrapPointer(thsPtr, b2QueryCallback);
                var fixture = Box2D.wrapPointer(fixturePtr, b2Fixture);
                if (fixture.GetBody().GetType() != Box2D.b2_dynamicBody)
                    return true;
                if (!fixture.TestPoint(ths.m_point))
                    return true;
                ths.m_fixture = fixture;
                return false;
            }
    }]);


        document.addEventListener("mousedown", function(event) {
            isBegin = true;
            saveMousePosition(event);
            document.addEventListener("mousemove", onMove, true);
        }, true);

        document.addEventListener("mouseup", function(event) {
            document.removeEventListener("mousemove", onMove, true);
            isBegin = false;
            if (!wasMoved) onClick();
            wasMoved = false;
            touchX = undefined;
            touchY = undefined;
        }, true);

        renderer.view.addEventListener("touchstart", function(event) {
            isBegin = true;
            saveMousePosition(event);
            renderer.view.addEventListener("touchmove", onMove, true);
        }, true);

        renderer.view.addEventListener("touchend", function(event) {
            renderer.view.removeEventListener("touchmove", onMove, true);
            isBegin = false;
            if (!wasMoved) onClick();
            wasMoved = false;
            touchX = undefined;
            touchY = undefined;
        }, true);

        update();
    }

    function getBodyAtMouse() {
        // Make a small box.
        var aabb = new Box2D.b2AABB();
        var d = 0.001;
        aabb.set_lowerBound(new b2Vec2(touchX - d, touchY - d));
        aabb.set_upperBound(new b2Vec2(touchX + d, touchY + d));

        // Query the world for overlapping shapes.
        myQueryCallback.m_fixture = null;
        myQueryCallback.m_point = new b2Vec2(touchX, touchY);
        world.QueryAABB(myQueryCallback, aabb);

        if (myQueryCallback.m_fixture) {
            return myQueryCallback.m_fixture.GetBody();
        }
    }

    function onMove(event) {
        wasMoved = true;
        saveMousePosition(event);
    }

    function saveMousePosition(event) {
        if (event.changedTouches) {
            var touche = event.changedTouches[0];
            touchX = touche.pageX / METER;
            touchY = touche.pageY / METER;
        } else {
            touchX = event.layerX / METER;
            touchY = event.layerY / METER;
        }
    }

    function onClick() {
        var dragBody = getBodyAtMouse();
        if (dragBody) {
            var i = dragBody.i;
            // Remove it
            world.DestroyBody(dragBody);
            stage.removeChild(actors[i]);
            bodies[i] = null;
            actors[i] = null;
        } else {
            placeTooth(touchX, touchY);
        }

    }

    function update() {
        requestAnimationFrame(update);

        if (isBegin && wasMoved && !mouseJoint) {
            var dragBody = getBodyAtMouse();
            if (dragBody) {
                var jointDef = new Box2D.b2MouseJointDef();
                jointDef.set_bodyA(mouseJointGroundBody);
                jointDef.set_bodyB(dragBody);
                jointDef.set_target(new b2Vec2(touchX, touchY));
                jointDef.set_maxForce(500 * dragBody.GetMass());
                jointDef.set_collideConnected(true);

                mouseJoint = Box2D.castObject(world.CreateJoint(jointDef), b2MouseJoint);
                dragBody.SetAwake(true);
            }
        }

        if (mouseJoint) {
            if (isBegin)
                mouseJoint.SetTarget(new Box2D.b2Vec2(touchX, touchY));
            else {
                world.DestroyJoint(mouseJoint);
                mouseJoint = null;
            }
        }

        world.Step(1 / 30, 1, 1);
        world.ClearForces();

        var n = actors.length;
        for (var i = 0; i < n; i++) {
            var actor = actors[i];
            if (!actor) continue;
            var body = bodies[i];
            var position = body.GetPosition();
            actor.position.x = position.get_x() * METER;
            actor.position.y = position.get_y() * METER;
            actor.rotation = roundOfAngle(body.GetAngle());
        }

        renderer.render(stage);
        stats.update();
    }

    function roundOfAngle(angle) {
        var deg = angle * 180 / Math.PI;
        if (Math.abs(deg) < 4) {
            return 0;
        } else {
            return angle;
        }
    }

    function scaleParts() {
        var o = -originalToothSize / 2;

        parts.forEach(function(part) {
            part.forEach(function(point) {
                point[0] += o;
                point[1] += o;
                point[0] /= (METER / toothScale);
                point[1] /= (METER / toothScale);
            });
        });
    }


    function arrayToVector(array) {
        return new Box2D.b2Vec2(array[0], array[1]);
    }


    function placeTooth(x, y) {
        // X && Y in physical units
        var i = bodies.length;

        var toothSprite = new PIXI.Sprite(PIXI.Texture.fromFrame("assets/tooth.png"));

        stage.addChild(toothSprite);
        toothSprite.i = i;
        toothSprite.anchor.x = toothSprite.anchor.y = 0.5;
        toothSprite.scale.x = toothSprite.scale.y = toothScale*1.04;

        bodyDef.get_position().Set(x, y);
        bodyDef.set_linearDamping(0.5);

        var body = world.CreateBody(bodyDef);
        body.i = i;

        parts.forEach(function(part) {
            var array = [];
            part.forEach(function(point) {
                array.push(arrayToVector(point));
            });

            var shape = createPolygonShape(array);
            polyFixture.set_shape(shape);
            polyFixture.set_friction(6);
            polyFixture.set_density(20);
            polyFixture.set_restitution(0.2);

            body.CreateFixture(polyFixture);
        });

        bodies.push(body);
        actors.push(toothSprite);
    }

    function createPolygonShape(vertices) {
        var shape = new Box2D.b2PolygonShape();
        var buffer = Box2D.allocate(vertices.length * 8, 'float', Box2D.ALLOC_STACK);
        var offset = 0;
        for (var i = 0; i < vertices.length; i++) {
            Box2D.setValue(buffer + (offset), vertices[i].get_x(), 'float'); // x
            Box2D.setValue(buffer + (offset + 4), vertices[i].get_y(), 'float'); // y
            offset += 8;
        }
        var ptr_wrapped = Box2D.wrapPointer(buffer, Box2D.b2Vec2);
        shape.Set(ptr_wrapped, vertices.length);
        return shape;
    }


    function preStack() {
        var spacing = toothSpacing / METER;

        var size = toothSize / METER + spacing;
        var x, y;

        // Rows
        for (var i = 0; i < 130; i++) {
            for (var j = 0; j < teethInRow; j++) {
                // Positions
                x = (j * size * 0.8) + size/2;
                y = (i * size * 0.8) + size/2;

                // y is top origin
                y = (STAGE_HEIGHT / METER) - y;

                placeTooth(x, y);
            }
        }
    }

    //--------------------------------------------------------------------------
    var createUI = function() {
        // ui = document.createElement('div');
    };
    //--------------------------------------------------------------------------
    that = {
        get pallette  () {
            return pallete;
        },
        set pallette (value) {
            pallette = value;
        },
        load: function(editorStateJSON) {
            var editorState = JSON.parse(editorStateJSON);
        },
        save: function() {
            var ret = {};

            return JSON.stringify(ret);
        },
        get canvas () {
            return stage;
        },
        get ui () {
            return ui;
        }
    };

    onload();
    return that;
};