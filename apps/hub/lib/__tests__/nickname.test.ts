import { validateNickname, normalizeNickname, graphemeLength } from '../nickname';

describe('nickname validation', () => {
  describe('validateNickname', () => {
    test('valid cases', () => {
      expect(validateNickname('test1')).toEqual({ ok: true, value: 'test1' });
      expect(validateNickname('テスト1')).toEqual({ ok: true, value: 'テスト1' });
      expect(validateNickname('あいう')).toEqual({ ok: true, value: 'あいう' });
      expect(validateNickname('カタカナ')).toEqual({ ok: true, value: 'カタカナ' });
      expect(validateNickname('漢字')).toEqual({ ok: true, value: '漢字' });
      expect(validateNickname('ＡＢＣ')).toEqual({ ok: true, value: 'ABC' }); // NFKC正規化
    });

    test('length validation', () => {
      expect(validateNickname('')).toEqual({ ok: false, reason: 'length' });
      expect(validateNickname('abcdefghi')).toEqual({ ok: false, reason: 'length' }); // 9文字
    });

    test('charset validation', () => {
      expect(validateNickname('test 1')).toEqual({ ok: false, reason: 'charset', bad: [' '] });
      expect(validateNickname('test😺')).toEqual({ ok: false, reason: 'charset', bad: ['😺'] });
      expect(validateNickname('test_')).toEqual({ ok: false, reason: 'charset', bad: ['_'] });
    });
  });

  describe('normalizeNickname', () => {
    test('normalization', () => {
      expect(normalizeNickname('  test  ')).toBe('test');
      expect(normalizeNickname('ＡＢＣ')).toBe('ABC');
      expect(normalizeNickname('１２３')).toBe('123');
    });
  });

  describe('graphemeLength', () => {
    test('grapheme counting', () => {
      expect(graphemeLength('test')).toBe(4);
      expect(graphemeLength('テスト')).toBe(3);
      expect(graphemeLength('あいう')).toBe(3);
      expect(graphemeLength('漢字')).toBe(2);
    });
  });
});
