/*jshint plusplus: false, passfail: true, browser: true, devel: true, indent: 4,
maxlen: 100, -W097, unused: true*/

var monikerEditor = function(_width, _height, _meter, _palette, _rotate, cb) {
    var that = {},
        rotate = _rotate || false,
        palette = _palette,
        ui;

    var toothBitmap = 'assets/tooth16.png';
    var STAGE_WIDTH = (rotate) ? _height : _width,
        STAGE_HEIGHT = (rotate) ? _width : _height;

    var METER = _meter;

    var bodies = [],
        actors = [],
        fixtures = [];
    var stage, renderer;
    var world, mouseJoint;
    var touchX, touchY;
    var isBegin, wasMoved;
    var stats;
    var myQueryCallback;
    var mouseJointGroundBody;

    var polyFixture, bodyDef;

    var originalToothSizeVector = 270;
    var toothSize = 16;
    var overlapFactor = (16 - 3) / 16;

    // A row of n teeth needs 1*toothSize + (n-1) * toothSize * 0.8 space
    var teethInRow = Math.ceil(_width / (toothSize * overlapFactor)) + 1;

    // This is used for the physics vector representation
    var toothScale = toothSize/originalToothSizeVector;

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

    function rgbToHex (r, g, b) {
        return (r << 16) + (g << 8) + b;
    }

    function onLoad() {
        var container = document.createElement("div");
        document.body.appendChild(container);

        stats = new Stats();
        // Enable or disable stats here
        container.appendChild(stats.domElement);
        stats.domElement.style.position = "absolute";

        stage = new PIXI.Stage(0xFFF, true);

        renderer = PIXI.autoDetectRenderer(STAGE_WIDTH, STAGE_HEIGHT, undefined, false);
        document.body.appendChild(renderer.view);

        scaleParts(parts);

        var loader = new PIXI.AssetLoader([toothBitmap]);

        loader.onComplete = onLoadAssets;
        loader.load();
    }

    function onLoadAssets() {
        world = new Box2D.b2World(new Box2D.b2Vec2(0, 0), true);
        mouseJointGroundBody = world.CreateBody(new Box2D.b2BodyDef());
        world.SetContinuousPhysics(true);

        polyFixture = new Box2D.b2FixtureDef();
        var shape = new Box2D.b2PolygonShape();
        polyFixture.set_shape(shape);
        polyFixture.set_density(1);

        bodyDef = new Box2D.b2BodyDef();

        // Length of walls
        var boxWidth = STAGE_WIDTH / METER;
        var boxHeight = STAGE_HEIGHT / METER;
        var padding = 3;

        //bottom
        shape.SetAsBox(boxWidth, 1);
        bodyDef.get_position().Set(boxWidth/2, boxHeight + padding);
        world.CreateBody(bodyDef).CreateFixture(polyFixture);

        //top
        bodyDef.get_position().Set(boxWidth/2, - padding);
        world.CreateBody(bodyDef).CreateFixture(polyFixture);

        //left wall
        shape.SetAsBox(1, boxHeight);
        bodyDef.get_position().Set(-padding, 0);
        world.CreateBody(bodyDef).CreateFixture(polyFixture);

        //right wall
        bodyDef.get_position().Set(boxWidth + padding, 0);
        world.CreateBody(bodyDef).CreateFixture(polyFixture);

        bodyDef.set_type(Box2D.b2_dynamicBody);

        preStack();

        myQueryCallback = new Box2D.b2QueryCallback();

        Box2D.customizeVTable(myQueryCallback, [{
            original: Box2D.b2QueryCallback.prototype.ReportFixture,
            replacement: function(thsPtr, fixturePtr) {
                var ths = Box2D.wrapPointer(thsPtr, Box2D.b2QueryCallback);
                var fixture = Box2D.wrapPointer(fixturePtr, Box2D.b2Fixture);
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

        document.addEventListener("mouseup", function() {
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

        renderer.view.addEventListener("touchend", function() {
            renderer.view.removeEventListener("touchmove", onMove, true);
            isBegin = false;
            if (!wasMoved) onClick();
            wasMoved = false;
            touchX = undefined;
            touchY = undefined;
        }, true);

        thresholdFilter = new PIXI.ThresholdFilter();
        thresholdFilter.threshold = 0.6;
        thresholdFilter.colorBack = _palette[0];
        thresholdFilter.colorFront = _palette[1];
        stage.filters = [thresholdFilter];

        update();

        if (cb) cb();
    }

    function getBodyAtMouse() {
        // Make a small box.
        var aabb = new Box2D.b2AABB();
        var d = 0.001;
        aabb.set_lowerBound(new Box2D.b2Vec2(touchX - d, touchY - d));
        aabb.set_upperBound(new Box2D.b2Vec2(touchX + d, touchY + d));

        // Query the world for overlapping shapes.
        myQueryCallback.m_fixture = null;
        myQueryCallback.m_point = new Box2D.b2Vec2(touchX, touchY);
        world.QueryAABB(myQueryCallback, aabb);

        if (myQueryCallback.m_fixture) {
            return myQueryCallback.m_fixture.GetBody();
        }
    }

    function onMove(event) {
        wasMoved = true;
        saveMousePosition(event);
    }

    // A pretty fast toFixed(3) alternative
    // See http://jsperf.com/parsefloat-tofixed-vs-math-round/18
    function toFixed(v) {
        return Math.floor(v * 1000) / 1000;
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
            placeTooth(touchX, touchY, Math.random() * Math.PI);
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
                jointDef.set_target(new Box2D.b2Vec2(touchX, touchY));
                jointDef.set_maxForce(500 * dragBody.GetMass());
                jointDef.set_collideConnected(true);

                mouseJoint = Box2D.castObject(world.CreateJoint(jointDef), Box2D.b2MouseJoint);
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

            actor.rotation = roundOfAngle(body.GetAngle());
            if (actor.rotation === 0) {
                actor.position.x = Math.round(position.get_x() * METER);
                actor.position.y = Math.round(position.get_y() * METER);
            } else {
                actor.position.x = position.get_x() * METER;
                actor.position.y = position.get_y() * METER;
            }


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
        var o = -originalToothSizeVector / 2;

        parts.forEach(function(part) {
            part.forEach(function(point) {
                point[0] += o;
                point[1] += o;
                point[0] /= (METER / toothScale * 1.02);
                point[1] /= (METER / toothScale * 1.02);
            });
        });
    }

    function arrayToVector(array) {
        return new Box2D.b2Vec2(array[0], array[1]);
    }


    function placeTooth(x, y, angle, pixelUnits) {
        if (pixelUnits) {
          x /= METER;
          y /= METER;
        }
        var i = bodies.length;

        var toothSprite = new PIXI.Sprite(PIXI.Texture.fromFrame(toothBitmap));

        stage.addChild(toothSprite);
        toothSprite.i = i;
        toothSprite.anchor.x = toothSprite.anchor.y = 0.5;

        bodyDef.get_position().Set(x, y);
        bodyDef.set_linearDamping(0.8);
        bodyDef.set_angularDamping(0.8);

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

            var fix = body.CreateFixture(polyFixture);
            fixtures.push(fix);
        });

        if (angle) {
          body.SetTransform(new Box2D.b2Vec2(x, y), angle);
        }

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
        var total = 0;
        var spacing = 0;

        var size = toothSize / METER + spacing;
        var x, y;

        // How high to stack them.
        // Divided by 0.8 since the teeth overlap.
        var height = Math.ceil(_height/toothSize/overlapFactor) + 1;

        // Rows
        for (var i = 0; i < height; i++) {
            // Columns
            for (var j = 0; j < teethInRow; j++) {
                // Positions
                x = (j * size * overlapFactor) + size/2 - size*overlapFactor;
                y = (i * size * overlapFactor) + size/2 - size*overlapFactor;

                // y is top origin
                y = (_height / METER) - y;

                if (rotate) {
                  placeTooth(y, x, Math.PI * 0.5);
                } else {
                  placeTooth(x, y);
                }

                total++;
            }
        }

        console.log('Added', total);
    }

    //--------------------------------------------------------------------------
    var createUI = function() {
        // ui = document.createElement('div');
    };
    //--------------------------------------------------------------------------
    that = {
        get palette  () {
            return pallete;
        },
        set palette (value) {
            // TODO the background and image need to update based on this
            palette = value;
            var filter = this.filter;
            filter.colorBack = palette[0];
            filter.colorFront = palette[1];
        },
        clear: function () {
            // Remove all current actors from the stage
            actors.forEach(function (item, i) {
              // Might have been destroyed earlier
              if (item) {
                // PIXI
                stage.removeChild(item);
                // Box2D
                world.DestroyBody(bodies[i]);
              }
            });

            actors = [];
            bodies = [];
        },
        load: function(editorStateJSON) {
            var editorState = JSON.parse(editorStateJSON);

            this.clear();

            stage.setBackgroundColor(rgbToHex.apply(null, editorState.palette[0]));

            editorState.actors.forEach(function (item) {
              placeTooth(item.x, item.y, item.rotation, true);
            });

        },
        save: function() {
            var ret = {
              actors: [],
              palette: palette
            };

            // Positions are save in pixels, not meters
            actors.forEach(function (item) {
              ret.actors.push({
                x: toFixed(item.position.x),
                y: toFixed(item.position.y),
                rotation: toFixed(item.rotation)
              });
            });

            return JSON.stringify(ret);
        },
        get userCanvas () {
            return renderer.view;
        },
        get dataCanvas () {
            return renderer.view;
        },
        get ui () {
            return ui;
        },
        get filter () {
            return thresholdFilter;
        },
        set friction (value) {
            fixtures.forEach(function (fix) {
                fix.SetFriction(value);
            });
        },
        set density (value) {
            fixtures.forEach(function (fix) {
                fix.SetDensity(value);
            });
        },
        set restitution (value) {
            fixtures.forEach(function (fix) {
                fix.SetRestitution(value);
            });
        },
        set damping (value) {
            bodies.forEach(function (body) {
                body.SetLinearDamping(value);
                body.SetAngularDamping(value);
                //body.SetLinearDamping(value);
            });
        }
    };

    onload();
    return that;
};
