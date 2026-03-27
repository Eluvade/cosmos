// ============================================================================
// GLSL Vertex Shader & Fragment Header
// ============================================================================

/** Fullscreen quad vertex shader. Maps [-1,1] to UV space. */
export const VERT_SRC = `
attribute vec2 a_position;
varying vec2 v_pos;
void main() {
    v_pos = a_position * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/** Fragment shader header: precision, uniforms, varyings. */
export const GLSL_HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_pos;

uniform float u_pixels;
uniform float u_time;
uniform float u_time_speed;
uniform float u_rotation;
uniform vec2 u_light_origin;
uniform float u_seed1, u_seed2, u_seed3, u_seed4, u_seed5, u_seed6;
uniform vec4 u_col0, u_col1, u_col2, u_col3, u_col4, u_col5;
uniform vec4 u_col6, u_col7, u_col8, u_col9, u_col10, u_col11;
uniform vec4 u_col12, u_col13, u_col14, u_col15;
uniform sampler2D u_noise_tex;
`;
