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
        colorFront: {type: '1f', value: 0.5},
        //FIXME: What type should this be?
        colorBack: {type: '1f', value: 0.5}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D uSampler;',
        'uniform float threshold;',

        'void main(void) {',
        '   vec4 color = texture2D(uSampler, vTextureCoord);',
        '   color = floor(color - threshold + 1.0);',
        '   gl_FragColor = color;',
        '}'
    ];
};

PIXI.ThresholdFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.ThresholdFilter.prototype.constructor = PIXI.ThresholdFilter;

/**
The number of steps.
@property step
*/
Object.defineProperty(PIXI.ThresholdFilter.prototype, 'threshold', {
    get: function() {
        return this.uniforms.threshold.value;
    },
    set: function(value) {
        this.uniforms.threshold.value = value;
    }
});
