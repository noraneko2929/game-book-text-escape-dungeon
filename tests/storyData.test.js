const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const storySource = fs.readFileSync(path.join(root, 'storyData.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'gameEngine.js'), 'utf8');

function loadStory() {
    const context = vm.createContext({});
    vm.runInContext(`${storySource}\n;globalThis.__storyData = storyData;`, context);
    return context.__storyData;
}

test('story and engine scripts have valid JavaScript syntax', () => {
    assert.doesNotThrow(() => new vm.Script(storySource));
    assert.doesNotThrow(() => new vm.Script(engineSource));
});

test('every scene has the expected data structure', () => {
    const story = loadStory();
    assert.ok(story.start, 'start scene must exist');
    assert.ok(story.escape_true, 'successful ending must exist');

    for (const [key, scene] of Object.entries(story)) {
        assert.equal(typeof scene.text, 'string', `${key}: text must be a string`);
        assert.ok(scene.text.trim().length > 0, `${key}: text must not be empty`);
        assert.equal(typeof scene.status, 'string', `${key}: status must be a string`);
        assert.ok(Array.isArray(scene.choices), `${key}: choices must be an array`);

        for (const [index, choice] of scene.choices.entries()) {
            assert.equal(typeof choice.text, 'string', `${key}[${index}]: choice text`);
            assert.ok(choice.text.trim().length > 0, `${key}[${index}]: choice must not be empty`);
            assert.equal(typeof choice.next, 'string', `${key}[${index}]: next must be a string`);
            assert.ok(story[choice.next], `${key}[${index}]: missing target ${choice.next}`);
        }

        if (key.startsWith('gameover_') || key.startsWith('escape_')) {
            assert.equal(scene.choices.length, 0, `${key}: endings must be terminal`);
        } else {
            assert.ok(scene.choices.length > 0, `${key}: non-ending scene needs an action`);
        }
    }
});

test('all scenes are reachable from the beginning', () => {
    const story = loadStory();
    const reached = new Set();
    const pending = ['start'];

    while (pending.length > 0) {
        const key = pending.pop();
        if (reached.has(key)) continue;
        reached.add(key);
        for (const choice of story[key].choices) pending.push(choice.next);
    }

    assert.deepEqual([...Object.keys(story)].filter(key => !reached.has(key)), []);
    assert.ok(reached.has('escape_true'), 'the successful ending must be reachable');
});

test('the story preserves the known floor-number reveal and checkpoints', () => {
    const story = loadStory();
    assert.ok(story.f15_p1, 'floor 15 reveal scene must exist');
    assert.ok(engineSource.includes("sceneKey === 'f15_p1'"), 'floor 15 checkpoint must remain');
    assert.ok(engineSource.includes("sceneKey === 'f10_p1'"), 'floor 10 checkpoint must remain');
    assert.ok(engineSource.includes("'第??階層'"), 'unknown floors must remain hidden before the reveal');
});

test('story avoids prohibited terminology and obvious editing artifacts', () => {
    const story = loadStory();
    for (const [key, scene] of Object.entries(story)) {
        assert.ok(!scene.status.includes('深層'), `${key}: prohibited floor terminology`);
            assert.ok(!scene.text.includes('\\n'), key + ': must not contain a literal backslash-n');
        for (const choice of scene.choices) {
            assert.ok(!choice.text.includes('登 the'), `${key}: stray editing artifact in choice`);
        }
    }
});


test('story pages stay concise and the added recovery beats remain reachable', () => {
    const story = loadStory();
    for (const [key, scene] of Object.entries(story)) {
        const visibleText = scene.text.replace(/<[^>]*>/g, '').replace(/\s/g, '');
        if (!key.startsWith('gameover_') && !key.startsWith('escape_')) {
            assert.ok(visibleText.length <= 90, `${key}: page text should stay within 90 characters`);
        }
    }

    for (const key of [
        'f16_p3', 'f16_pinch_shaft', 'gameover_f16_shaft',
        'f11_p2', 'f11_pinch_stair', 'gameover_f11_fall',
        'f6_p2', 'f6_pinch_crack', 'gameover_f6_crush'
    ]) {
        assert.ok(story[key], `${key}: pacing / recovery scene must exist`);
    }
});


test('key action choices have separate result scenes and the opening explains the situation', () => {
    const story = loadStory();
    for (const key of ['f20_p3', 'f14_p3', 'f14_p4', 'f13_p3']) {
        assert.ok(story[key], `${key}: action result scene must exist`);
    }
    assert.equal(story.f20_p2.choices.find(choice => choice.next === 'f20_p3')?.text.includes('服'), true);
    assert.equal(story.f14_p2.choices.find(choice => choice.next === 'f14_p3')?.text.includes('泥'), true);
    assert.equal(story.f13_p2.choices[0].next, 'f13_p3');
    assert.ok(story.start.text.includes('駆け出しの冒険者'));
});


test('ending and danger scene line breaks are real newlines, not visible escape sequences', () => {
    const story = loadStory();
    for (const [key, scene] of Object.entries(story)) {
        if (key.startsWith('gameover_') || key.includes('_pinch_')) {
            assert.ok(!scene.text.includes('\\n'), key + ': must not contain a literal backslash-n');
            assert.ok(scene.text.includes('\n\n'), key + ': expected a blank line after the heading');
        }
    }
});

test('floor 15 reveal and demon patrol are separated into distinct pages', () => {
    const story = loadStory();
    assert.ok(story.f15_p1.choices.some(choice => choice.next === 'f15_p1b'));
    assert.ok(story.f15_p1b, 'the wraith encounter setup page must exist');
    assert.ok(story.f15_p1b.text.includes('爪痕'));
    assert.ok(story.f15_p1b.text.includes('赤い光'));
});

test('floor 15 keeps the encounter within the dungeon demon theme', () => {
    const story = loadStory();
    assert.ok(story.f15_p1b.text.includes('悪魔') || story.f15_p1b.text.includes('爪痕'));
    assert.ok(story.f15_p1b.choices.some(choice => choice.text.includes('封魔紋')));
    assert.ok(story.f15_pinch_demon, 'the demon encounter danger scene must exist');
    assert.ok(story.gameover_demon_abyss, 'the demon ending must exist');
    assert.ok(!Object.keys(story).some(key => /wraith/i.test(key)));
    assert.ok(!Object.values(story).some(scene => /レイス|亡霊/.test(scene.text + scene.status)));
});

test('the opening uses a hidden passage and vertical shaft rather than a cave-in', () => {
    const story = loadStory();
    assert.ok(story.start.text.includes('隠し通路'));
    assert.ok(story.start.text.includes('縦穴'));
    assert.ok(story.start.text.includes('駆け出しの冒険者'));
    assert.ok(story.f17_p2.text.includes('石片'), 'the distraction stone must be present at the gate');
    assert.ok(story.f19_p3.choices[0].text.includes('小石'), 'the floor 19 distraction must use a locally available pebble');
    assert.ok(!story.start.text.includes('崩落に巻き込まれ'));
});

test('upper underground floors do not prematurely suggest the surface', () => {
    const story = loadStory();
    for (const key of ['f2_p1', 'f3_p1', 'f5_p1', 'f6_p1', 'f6_p2']) {
        assert.ok(!/太陽|木の葉|外の空気|地上が近い|外へ出たい/.test(story[key].text), key + ': surface cues appear too early');
    }
});

test('floor 13 uses an ancient stone mechanism rather than a modern control panel', () => {
    const story = loadStory();
    for (const key of ['f13_p1', 'f13_pinch_gate', 'f13_p2', 'f13_p3']) {
        assert.ok(!/鉄格子|制御盤|非常用/.test(story[key].text), key + ': modern / mismatched mechanism terminology');
        assert.ok(!/鉄格子|制御盤|非常用/.test(story[key].choices.map(choice => choice.text).join(' ')), key + ': outdated choice terminology');
    }
});

test('scene narration does not reveal the selected route or repeat the choice action', () => {
    const story = loadStory();
    assert.ok(!story.f19_p1.text.includes('風の音だけを頼りに進む'));
    assert.ok(!story.f7_p1.text.includes('こんな場所に、知っている人がいるはずがない'));
    assert.ok(!story.f8_p1.choices.some(choice => choice.text.includes('安全ルート')));
    assert.ok(!story.f16_p1.text.includes('待つ'));
    assert.ok(!story.f18_p2.text.includes('周期をうかがう'));
    assert.ok(!story.f12_p1.text.includes('目を凝らす'));
});


test('floor 20 choices are foreshadowed by visible environmental clues', () => {
    const story = loadStory();
    assert.ok(story.f20_p1.text.includes('水音'));
    assert.ok(story.f20_p1.text.includes('裂け目'));
});

test('floor 19 misleading ledge has a distinct, explained failure outcome', () => {
    const story = loadStory();
    assert.ok(story.f19_p2.choices.some(choice => choice.next === 'gameover_f19_shelf'));
    assert.ok(story.gameover_f19_shelf.text.includes('岩棚'));
    assert.ok(story.gameover_f19_shelf.text.includes('崩れかけた'));
});

test('floor 18 dangerous crystal and rockfall provide observable clues', () => {
    const story = loadStory();
    assert.ok(story.f18_p1.text.includes('耳鳴り'));
    assert.ok(story.gameover_crystal_blast.text.includes('叩き割った'));
    assert.ok(story.f18_p2.text.includes('一定の間隔'));
    assert.equal(story.f18_p2.choices[0].next, 'f18_pinch_wait');
    assert.equal(story.f18_pinch_wait.choices[0].next, 'f18_p3');
    assert.equal(story.gameover_crushed, undefined, 'the obsolete unreachable rockfall ending must be removed');
});

test('floor 13 lever is concealed and described consistently as a magical seal', () => {
    const story = loadStory();
    assert.ok(story.f13_p1.text.includes('石板'));
    assert.ok(!story.f13_p1.text.includes('小さなレバー'));
    assert.ok(story.f13_p2.text.includes('レバーが隠れていた'));
    assert.ok(story.f13_pinch_gate.text.includes('封印の反発'));
    assert.ok(story.f13_p2.status.includes('隠されたレバー'));
});

test('floor 17 rope distraction explains how the rope reaches beyond the gate', () => {
    const story = loadStory();
    assert.ok(story.f17_p3.text.includes('柱に当たって'));
    assert.ok(story.f17_p3.text.includes('手繰り寄せる'), 'the rope must be recoverable from the far side of the gate');
    assert.ok(story.f17_p3.text.includes('門の向こう'));
});

test('non-ending scene text remains within the 90-character mobile guideline', () => {
    const story = loadStory();
    for (const [key, scene] of Object.entries(story)) {
        if (!key.startsWith('gameover_') && !key.startsWith('escape_')) {
            const visibleText = scene.text.replace(/<[^>]*>/g, '').replace(/\s/g, '');
            assert.ok(visibleText.length <= 90, `${key}: ${visibleText.length} characters`);
        }
    }
});
