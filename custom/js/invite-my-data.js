(function() {
  var filters = ['今日', '昨日', '本周', '上周', '本月', '上月'];

  var sections = [
    {
      title: '直属数据',
      compact: true,
      fillGrid: true,
      items: [
        ['新增直属', '0'],
        ['充值人数', '0'],
        ['首充人数', '0'],
        ['充值金额', '0.00', true],
        ['首充金额', '0.00', true],
        ['提现金额', '0.00', true],
        ['提现次数', '0'],
        ['有效投注', '0.00', true],
        ['投注人数', '0'],
        ['直属输赢', '0.00', true],
        ['直属业绩', '0.00', true]
      ]
    },
    {
      title: '直属收益',
      items: [
        ['直属佣金', '0.00', true],
        ['其他佣金', '0.00', true],
        ['总佣金', '0.00', true]
      ]
    },
    {
      title: '总数据',
      items: [
        ['直属人数', '0'],
        ['其他人数', '0'],
        ['总人数', '0'],
        ['直属业绩', '0.00', true],
        ['其他业绩', '0.00', true],
        ['总业绩', '0.00', true],
        ['累计直属充值', '0.00', true],
        ['累计直属有效投注', '0.00', true],
        ['累计直属输赢', '0.00', true]
      ]
    },
    {
      title: '总收益',
      items: [
        ['累计直属佣金', '0.00', true],
        ['累计其他佣金', '0.00', true],
        ['累计总佣金', '0.00', true]
      ]
    }
  ];

  function itemMarkup(item, index, total) {
    var isMoney = item[2] ? ' invite-data-value--money' : '';
    var wide = total % 3 === 1 && index === total - 1 ? ' invite-data-item--wide' : '';

    return [
      '<div class="invite-data-item' + wide + '">',
      '<div class="invite-data-label">' + item[0] + '</div>',
      '<div class="invite-data-value' + isMoney + '">' + item[1] + '</div>',
      '</div>'
    ].join('');
  }

  function sectionMarkup(section) {
    var className = 'invite-data-section' + (section.compact ? ' invite-data-section--compact' : '');
    var items = section.items.map(function(item, index) {
      return itemMarkup(item, index, section.items.length);
    });
    var remainder = section.fillGrid ? section.items.length % 3 : 0;

    if (remainder) {
      for (var i = remainder; i < 3; i += 1) {
        items.push('<div class="invite-data-item invite-data-item--empty"></div>');
      }
    }

    return [
      '<section class="' + className + '">',
      '<div class="invite-data-section__title">' + section.title + '</div>',
      '<div class="invite-data-grid">',
      items.join(''),
      '</div>',
      '</section>'
    ].join('');
  }

  function renderMyData() {
    var state = document.getElementById('u1_state1_content');
    if (!state || document.querySelector('.invite-my-data')) {
      return;
    }

    Array.prototype.forEach.call(state.children, function(child) {
      child.style.display = 'none';
    });

    var wrapper = document.createElement('div');
    wrapper.className = 'invite-my-data';
    wrapper.innerHTML = [
      '<div class="invite-my-data__filters">',
      filters.map(function(filter, index) {
        return '<div class="invite-my-data__filter' + (index === 0 ? ' is-active' : '') + '">' + filter + '</div>';
      }).join(''),
      '</div>',
      sections.map(sectionMarkup).join('')
    ].join('');

    state.appendChild(wrapper);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderMyData);
  } else {
    renderMyData();
  }
})();
