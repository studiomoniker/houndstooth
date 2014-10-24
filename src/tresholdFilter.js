/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This lowers the color depth of your image by the given amount, producing an image with a smaller palette.
 * @class ColorStepFilter
 * @contructor
 */
PIXI.ThresholdFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        threshold: {type: '1f', value: 0.5},
        //FIXME: What type should this be?
        colorFront: {type: '4fv', value: new Float32Array([1, 0, 0, 1])},
        //FIXME: What type should this be?
        colorBack: {type: '4fv', value: new Float32Array([0, 0, 1, 1])}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D uSampler;',
        'uniform float threshold;',
        'uniform vec4 colorFront;',
        'uniform vec4 colorBack;',

        'void main(void) {',
        '   vec4 color = texture2D(uSampler, vTextureCoord);',
        '   color = floor(color - threshold + 1.0);',
        '   if (color.a == 1.0) {',
        '     gl_FragColor = colorFront;',
        '   } else {',
        '     gl_FragColor = colorBack;',
        '   }',
        '}'
    ];
};

PIXI.ThresholdFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.ThresholdFilter.prototype.constructor = PIXI.ThresholdFilter;

/**
The threshold value
@property threshold
*/
Object.defineProperty(PIXI.ThresholdFilter.prototype, 'threshold', {
    get: function() {
        return this.uniforms.threshold.value;
    },
    set: function(value) {
        this.uniforms.threshold.value = value;
    }
});


Object.defineProperty(PIXI.ThresholdFilter.prototype, 'colorFront', {
    get: function() {
        return this.uniforms.colorFront.value;
    },
    set: function(v) {
        var a = new Float32Array([v[0]/255, v[1]/255, v[2]/255, 1]);
        this.uniforms.colorFront.value = a;
    }
});


Object.defineProperty(PIXI.ThresholdFilter.prototype, 'colorBack', {
    get: function() {
        return this.uniforms.colorBack.value;
    },
    set: function(v) {
        var a = new Float32Array([v[0]/255, v[1]/255, v[2]/255, 1]);
        this.uniforms.colorBack.value = a;
    }
});
