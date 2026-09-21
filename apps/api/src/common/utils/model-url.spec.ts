import { modelUrlSchema } from './model-url';

describe('modelUrlSchema', () => {
  it.each([
    'https://res.cloudinary.com/demo/raw/upload/v1/shoe.glb',
    'https://example.com/models/robot.gltf',
    'https://example.com/models/ROBOT.GLB?v=2',
  ])('accepts %s', (url) => {
    expect(modelUrlSchema.parse(url)).toBe(url);
  });

  it('accepts an empty string (clears the field) and undefined', () => {
    expect(modelUrlSchema.parse('')).toBe('');
    expect(modelUrlSchema.parse(undefined)).toBeUndefined();
  });

  it.each([
    'http://example.com/model.glb',
    'https://example.com/model.obj',
    'https://example.com/model.glb.png',
    'javascript:alert(1)//x.glb',
    'not a url',
    `https://example.com/${'a'.repeat(2050)}.glb`,
  ])('rejects %s', (url) => {
    expect(modelUrlSchema.safeParse(url).success).toBe(false);
  });
});
