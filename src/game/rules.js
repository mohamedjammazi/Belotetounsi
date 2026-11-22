'use strict';
// ==========================================
// 1. ثوابت وقوانين البلوت التونسي (32 ورقة)
// ==========================================
const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// نقاط الأوراق حسب الجدول التونسي:
// الأتو (Atout color 4): V(J)=20, 9=14, A=11, 10=10, R(K)=4, D(Q)=3, 8=0, 7=0 (المجموع = 62)
// العادي (Simple color 1,2,3): A=11, 10=10, R(K)=4, D(Q)=3, V(J)=2, 9=0, 8=0, 7=0 (30×3 = 90)
// إجمالي الأوراق = 152 + 10 (فرشة/أخيرة) = 162 (تُحسب 160) + 20 (بلوت وريبلوت) = 182 (تُحسب 180)
const POINTS_TRUMP = { 'J': 20, '9': 14, 'A': 11, '10': 10, 'K': 4, 'Q': 3, '8': 0, '7': 0 };
const POINTS_NORMAL = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0 };

// قوة الأوراق للمقارنة وأكل الطشة
const POWER_TRUMP = { '7': 1, '8': 2, 'Q': 3, 'K': 4, '10': 5, 'A': 6, '9': 7, 'J': 8 };
const POWER_NORMAL = { '7': 1, '8': 2, '9': 3, 'J': 4, 'Q': 5, 'K': 6, '10': 7, 'A': 8 };

// قيم الفتح المسموحة في البلوت التونسي (من 90 إلى 180، والكبوت المعلن = 500)
const VALID_BID_VALUES = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 500];

function createDeck() {
    const deck = [];
    const seenIds = new Set();
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            const id = `${rank}_${suit}`;
            if (!seenIds.has(id)) {
                seenIds.add(id);
                deck.push({ suit, rank, id });
            }
        }
    }
    // خلط عشوائي متوازن (Fisher-Yates) لـ 32 ورقة فريدة تماماً
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function sortHand(hand, trumpSuit) {
    const suitOrder = { 'spades': 1, 'hearts': 2, 'clubs': 3, 'diamonds': 4 };
    return hand.sort((a, b) => {
        if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
        const powerMap = (a.suit === trumpSuit) ? POWER_TRUMP : POWER_NORMAL;
        return powerMap[a.rank] - powerMap[b.rank];
    });
}

module.exports = {
    SUITS,
    RANKS,
    POINTS_TRUMP,
    POINTS_NORMAL,
    POWER_TRUMP,
    POWER_NORMAL,
    VALID_BID_VALUES,
    createDeck,
    sortHand
};