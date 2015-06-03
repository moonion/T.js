(function() {
  var PATTERN = /{>?({?[^{}]*}?)}/gi;
  var LT = /</g;
  var GT = />/g;
  var langs = {};
  var lang;
  var listeners = [];
  var inline = false;
  var cssInserted = false;
  var popups = [];

  /* Utils for plurals */
  var PLURAL_CATEGORY = { ZERO: 'zero', ONE: 'one', TWO: 'two', FEW: 'few', MANY: 'many', OTHER: 'other' };
  var GENDER = { MALE: 'm', FEMALE: 'f' };
  function getDecimals(n) {
    n = n + '';
    var i = n.indexOf('.');
    return (i == -1) ? 0 : n.length - i - 1;
  }

  function getVF(n, opt_precision) {
    var v = opt_precision;

    if (undefined === v) {
      v = Math.min(getDecimals(n), 3);
    }

    var base = Math.pow(10, v);
    var f = ((n * base) | 0) % base;
    return {v: v, f: f};
  }
  var plurals = {
    'ru,uk,be': function(n, opt_precision) { 
      var i = n | 0;
      var vf = getVF(n, opt_precision);
      if (vf.v == 0 && i % 10 == 1 && i % 100 != 11) { return PLURAL_CATEGORY.ONE;  }
      if (vf.v == 0 && i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14)) { return PLURAL_CATEGORY.FEW;  }
      if (vf.v == 0 && i % 10 == 0 || vf.v == 0 && i % 10 >= 5 && i % 10 <= 9 || vf.v == 0 && i % 100 >= 11 && i % 100 <= 14) { return PLURAL_CATEGORY.MANY;  } 
      return PLURAL_CATEGORY.OTHER;
    },
    'en': function(n, opt_precision) {
      var i = n | 0;
      var vf = getVF(n, opt_precision);
      if (i == 1 && vf.v == 0) { 
        return PLURAL_CATEGORY.ONE;
      }
      return PLURAL_CATEGORY.OTHER;
    }
  };
  /* Utils for inflection of Russian names */
  var infRules = {
    name: [
      '=m:лев:--ьва,--ьву,--ьва,--ьвом,--ьве',
      '=m:пётр:---етра,---етру,---етра,---етром,---етре',
      '=m:павел:--ла,--лу,--ла,--лом,--ле',
      '=m:яша:-и,-е,-у,-ей,-е',
      '=m:шота',
      '=f:рашель,нинель,николь,габриэль,даниэль',
      'a:е,ё,и,о,у,ы,э,ю', 'f:б,в,г,д,ж,з,й,к,л,м,н,п,р,с,т,ф,х,ц,ч,ш,щ,ъ', 'f:ь:-и,-и,,ю,-и', 'm:ь:-я,-ю,-я,-ем,-е',
      'a:га,ка,ха,ча,ща,жа:-и,-е,-у,-ой,-е', 'f:ша:-и,-е,-у,-ей,-е', 'a:а:-ы,-е,-у,-ой,-е',
      'f:ия:-и,-и,-ю,-ей,-и', 'f:а:-ы,-е,-у,-ой,-е', 'f:я:-и,-е,-ю,-ей,-е',
      'm:ия:-и,-и,-ю,-ей,-и', 'm:я:-и,-е,-ю,-ей,-е', 'm:ей:-я,-ю,-я,-ем,-е', 'm:ий:-я,-ю,-я,-ем,-и', 'm:й:-я,-ю,-я,-ем,-е',
      'm:б,в,г,д,ж,з,к,л,м,н,п,р,с,т,ф,х,ц,ч:а,у,а,ом,е', 'a:ния,рия,вия:-и,-и,-ю,-ем,-ем'
    ],
    surname: [
      '^a:бонч,абдул,белиц,гасан,дюссар,дюмон,книппер,корвин,ван,шолом,тер,призван,мелик,вар,фон',
      '=a:дюма,тома,дега,люка,ферма,гамарра,петипа,шандра,скаля,каруана',
      '=a:гусь,ремень,камень,онук,богода,нечипас,долгопалец,маненок,рева,кива',
      '=a:вий,сой,цой,хой:-я,-ю,-я,-ем,-е', '=a:я',
      'f:б,в,г,д,ж,з,й,к,л,м,н,п,р,с,т,ф,х,ц,ч,ш,щ,ъ,ь', 'a:гава,орота', 'f:ска,цка:-ой,-ой,-ую,-ой,-ой',
      'f:цкая,ская,ная,ая:--ой,--ой,--ую,--ой,--ой', 'f:яя:--ей,--ей,--юю,--ей,--ей', 'f:на:-ой,-ой,-у,-ой,-ой',
      'm:иной:-я,-ю,-я,-ем,-е', 'm:уй:-я,-ю,-я,-ем,-е', 'a:ца:-ы,-е,-у,-ей,-е', 'm:рих:а,у,а,ом,е', 'a:ия',
      'a:иа,аа,оа,уа,ыа,еа,юа,эа', 'm:их,ых', 'a:о,е,э,и,ы,у,ю', 'f:ова,ева:-ой,-ой,-у,-ой,-ой',
      'a:га,ка,ха,ча,ща,жа,ша:-и,-е,-у,-ой,-е', 'a:а:-ы,-е,-у,-ой,-е', 'm:ь:-я,-ю,-я,-ем,-е', 'a:ия:-и,-и,-ю,-ей,-и',
      'a:я:-и,-е,-ю,-ей,-е', 'm:ей:-я,-ю,-я,-ем,-е', 'm:ян,ан,йн:а,у,а,ом,е',
      'm:ынец,обец:--ца,--цу,--ца,--цем,--це', 'm:онец,овец:--ца,--цу,--ца,--цом,--це',
      'm:ай:-я,-ю,-я,-ем,-е', 'm:кой:-го,-му,-го,--им,-м', 'm:гой:-го,-му,-го,--им,-м',
      'm:ой:-го,-му,-го,--ым,-м', 'm:ах,ив:а,у,а,ом,е', 'm:ший,щий,жий,ний:--его,--ему,--его,-м,--ем',
      'm:ый:--ого,--ому,--ого,-м,--ом', 'm:кий:--ого,--ому,--ого,-м,--ом',
      'm:ий:-я,-ю,-я,-ем,-и', 'm:ок:--ка,--ку,--ка,--ком,--ке', 'm:ец:--ца,--цу,--ца,--цом,--це', 'm:ц,ч,ш,щ:а,у,а,ем,е',
      'm:ен,нн,он,ун:а,у,а,ом,е', 'm:в,н:а,у,а,ым,е', 'm:б,г,д,ж,з,к,л,м,п,р,с,т,ф,х:а,у,а,ом,е'
    ],
    patronym: [
      'm:ич:а,у,а,ем,е', 'f:на:-ы,-е,-у,-ой,-е'
    ],
  };
  function inflect(rules, name, cs) {
    var g = GENDER.MALE;
    if (name.constructor != ''.constructor) {
      g = name.g || name[1] || GENDER.MALE;
      g = (g == 1 || (g+'')[0] == 'f') ? GENDER.FEMALE : GENDER.MALE;
      name = name.name || name[0];
    }
    name = name.split('-');
    var csind = ({ gen: 0, dat: 1, acc: 2, ins: 3, abl: 4 })[cs];
    if (csind === undefined) {
      return name.join('-');
    }
    for (var i = 0; i < name.length; i++) {
      var low = name[i].toLocaleLowerCase();
      for (var j = 0; j < rules.length; j++) {
        var rule = rules[j].split(':');
        var rg = rule[0][rule[0].length - 1];
        if (rg != 'a' && rg != g) continue;
        var vars = rule[1].split(',');
        if (rule[0][0] == '^' && (i || name.length == 1 || vars.indexOf(low) == -1)) continue;
        if (rule[0][0] == '=' && vars.indexOf(low) == -1) continue;
        var found = false;
        for (var k = 0; k < vars.length; k++) {
          if (low.substr(low.length - vars[k].length) == vars[k]) {
            found = true;
            break;
          }
        }
        if (!found) continue;
        if (rule.length < 3) break;
        var form = rule[2].split(',')[csind].split('-');
        name[i] = name[i].substr(0, name[i].length - form.length + 1) + form[form.length - 1];
        break;
      }
    }
    return name.join('-');
  };
  /* Default funcs */
  var defaults = {
    plural: function() {
      return PLURAL_CATEGORY.OTHER;
    },
    ru: {
      $T: {
        ok:           'OK',
        cancel:       'отмена',
        popup: {
          key:    'перевод ключа <b>{}</b>',
          all:    'список ключей',
          value:  'значение',
          one:    '1, 21, 101…',
          few:    '2, 22, 102…',
          many:   '5, 11, 105…',
          other:  'остальные случаи',
          m:      'мужской род',
          f:      'женский род',
          nom:    'именительный падеж (кто? что?)',
          gen:    'родительный падеж (кого? чего?)',
          dat:    'дательный падеж (кому? чему?)',
          acc:    'винительный падеж (кого? что?)',
          ins:    'творительный падеж (кем? чем?)',
          abl:    'предложный падеж (о ком? о чём?)',
        },
      },
      $name: function(name, cs) {
        return inflect(infRules.name, name, cs);
      },
      $surname: function(name, cs) {
        return inflect(infRules.surname, name, cs);
      },
      $patronym: function(name, cs) {
        return inflect(infRules.patronym, name, cs);
      },
    },
    en: {
      $T: {
        ok:           'OK',
        cancel:       'cancel',
        popup_key:    'translating key <b>{}</b>',
        popup_all:    'list of keys',
      },      
    }
  };
  for (var p in plurals) {
    var l = p.split(',');
    for (var i = 0; i < l.length; i++) {
      if (!defaults[l[i]]) {
        defaults[l[i]] = { };
      }
      defaults[l[i]].plural = plurals[p];
    }
  }

  /* Utils */
  var walk = function(path, obj) {
    var res = obj;
    for (var i = 0; i < path.length; i++) {
      res = res[path[i].toLowerCase()];
      if (!res) {
        return false;
      }
    }
    return res;
  }
  var wrap = function(s, k, inline) {
    if (!inline) {
      return s;
    }
    return '<span class="tjs-inline" onclick="return T.showKey(\'' + k + '\',event);">' + s + '</span>';
  }

  /* Translate */
  var T = function(key, sub, noinline) {
    if (key[key.length - 1] == '!') {
      noinline = true;
      key = key.substr(0, key.length - 1);
    }

    var path = key;
    var psub = sub;
    key = key.split('.'); // allow to specify key paths (recommended to put grammar case as last part: 'images.nom')
    var val = langs[lang];
    var plural = defaults.plural;
    
    if (!val) {
      if (defaults[lang] && defaults[lang][key[0]]) {
        val = defaults[lang];
      } else {
        return wrap(path, path, inline && !noinline);
      }
    }

    if (val.plural) {
      plural = val.$plural;
    } else
    if (defaults[lang] && defaults[lang].plural) {
      plural = defaults[lang].plural;
    }

    var root = true;
    for (var i = 0; i < key.length; i++) {
      if (typeof val == 'function') {
        return wrap(val.apply(null, [sub].concat(key.slice(i))), path, inline && !noinline);
      }
      val = val[key[i].toLowerCase()];
      if (!val) {
        if (root && defaults[lang][key[i]]) {
          val = defaults[lang][key[i]];
        } else {
          return wrap(path, path, inline && !noinline);
        }
      }
      root = false;
    }

    if (val === false || val === undefined) {
      return wrap(path, path, inline && !noinline);
    }

    if (sub !== undefined) {
      if (typeof sub !== 'object') {
        sub = [sub];
      }

      if (val.$plural) {
        var n = parseFloat(sub[0] !== undefined ? sub[0] : sub['n']);
        if (n in val.$plural) {
          val = val.$plural[n];
        } else {
          var cat = plural(n); // TODO: maybe use other plural categories engine
          if (cat in val.$plural) {
            val = val.$plural[cat];
          } else {
            val = val.$plural[PLURAL_CATEGORY.OTHER];
          }
        }
      }

      if (val.$gender) {
        var g = (sub[0] !== undefined ? sub[0] : sub['g']);
        val = (g == 1 || (g+'')[0] == 'f') ? val.$gender.f : val.$gender.m;
      }

      val = val.replace(PATTERN, function(match, name) {
        if ((match == '{' + name + '}') && (name[0] != '$')) { // substitute
          var esc = true;
          if (name[0] == '{' && name[name.length - 1] == '}') {
            esc = false;
            name = name.substr(1, name.length - 2);
          }
          name = name.trim();

          var subst;
          if (name == '') {
            name = 0;
            subst = sub[0];
          } else {
            subst = walk(name.split('.'), sub);
          }

          if (subst === false || subst === undefined) {
            return name;
          }

          if (parseInt(name) != name) {
            if (name == name.toUpperCase()) {
              subst = subst.toLocaleUpperCase();
            } else
            if (name.substr(0, 1).toUpperCase() == name.substr(0, 1)) {
              subst = subst.substr(0, 1).toLocaleUpperCase() + subst.substr(1);
            }
          }

          if (esc) {
            subst = ('' + subst).replace(GT, '&gt;').replace(LT, '&lt;');
          }

          return subst;
        } else
        if ((match == '{>' + name + '}') || ((match == '{' + name + '}') && (name[0] == '$'))) { // partial
          var parts = name.trim().split(' ');
          name = parts.shift().trim();
          var args = {};
          if (parts.length > 0) { // pass down some substitutions
            for (var i = 0; i < parts.length; i++) {
              var kv = parts[i].split('=');
              if (kv.length > 1) {
                args[kv[0].trim()] = args[i] = walk(kv[1].trim().split('.'), sub);
              } else {
                args[i] = walk(kv[0].trim().split('.'), sub);

                if (parts.length == 1) {
                  args = args[0];
                }
              }
            }
          } else {
            args = psub;
          }

          return T(name, args, true);
        }
        return match;
      });
    }

    var last = key.pop(); // perform text transformation based on the last key part
    if (last == last.toUpperCase()) {
      val = val.toLocaleUpperCase();
    } else
    if (last.substr(0, 1).toUpperCase() == last.substr(0, 1)) {
      val = val.substr(0, 1).toLocaleUpperCase() + val.substr(1);
    }
    return wrap(val, path, inline && !noinline);
  };

  T.define = function(lang, keys) {
    var obj, l, k;
    if (keys === undefined) {
      obj = lang;
    } else {
      obj = {};
      obj[lang] = keys;
    }
    for (l in obj) {
      if (!langs[l]) {
        langs[l] = {};
      }
      for (k in obj[l]) {
        langs[l][k] = obj[l][k];
      }
    }
  };

  T.lang = function(_lang) {
    if (_lang === undefined) {
      return lang;
    } else {
      lang = _lang;
    }
  };

  T.addUpdateListener = function(listener) {
    if (listeners.indexOf(listener) > -1) {
      return;
    }
    listeners.push(listener);
  };

  T.removeUpdateListener = function(listener) {
    if (listeners.indexOf(listener) > -1) {
      return;
    }
    listeners.splice(listeners.indexOf(listener), 1);
  };

  var callListeners = function() {
    for (var i = 0; i < listeners.length; i++) {
      listeners[i].apply(null, arguments);
    }
  };

  T.insertCSSRules = function(force) {
    if (cssInserted && !force) {
      return;
    }

    var style = document.createElement('style');
    style.appendChild(document.createTextNode(''));
    document.head.appendChild(style);
    var sh = style.sheet;
    var ind = 0;
    sh.insertRule('.tjs-inline { border-bottom: 1px dotted #333; cursor: pointer }', ind++);
    sh.insertRule('.tjs-inline:hover { background: #C7E6FF; }', ind++);
    sh.insertRule('.tjs-popup { position: fixed; top: 0; left: 0; bottom: 0; right: 0; background: rgba(0, 0, 0, 0.6); }', ind++);
    sh.insertRule('.tjs-box { width: 500px; max-width: 70%; margin: 100px auto; background: #f0f0f0; border-radius: 5px; box-shadow: 0px 2px 3px rgba(0, 0, 0, 0.3); }', ind++);
    sh.insertRule('.tjs-box-head { padding: 12px 15px; border-top-left-radius: 4px; border-top-right-radius: 4px; background: #006DC8; color: #fff; }', ind++);
    sh.insertRule('.tjs-box-footer { border-top: 1px solid #ccc; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; background: #fff; padding: 12px 15px }', ind++);
    sh.insertRule('.tjs-button { background: #006DC8; color: #fff; padding: 6px 12px; border-radius: 4px; box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3); cursor: pointer; }', ind++);
    sh.insertRule('.tjs-button:hover { background: #0085F4 }', ind++);
    sh.insertRule('.tjs-button:active { background: #005194 }', ind++);
    sh.insertRule('.tjs-box-body { padding: 0 15px 15px 15px; max-height: 600px; overflow-y: auto; }', ind++);
    sh.insertRule('.tjs-box-footer .tjs-button { margin-left: 15px; float: right }', ind++);
    sh.insertRule('.tjs-editor { padding: 6px 8px; border: 1px solid #ccc; background: #fff; border-radius: 3px; min-height: 60px; max-height: 240px; overflow-y: auto; }', ind++);
    sh.insertRule('.tjs-editor:focus { outline: none; border-color: #006DC8; }', ind++);
    sh.insertRule('.tjs-box-body > .tjs-keys { padding-left: 10px; }', ind++);
    sh.insertRule('.tjs-keys { list-style: none; padding-left: 24px; margin-bottom: 10px; }', ind++);
    sh.insertRule('.tjs-keys li { clear: both; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; padding-bottom: 2px; }', ind++);
    sh.insertRule('.tjs-key-name { color: #006DC8; border-bottom: 1px dotted #006DC8; cursor: pointer; }', ind++);
    sh.insertRule('.tjs-key-val { font-size: 70%; margin: 0px 6px; vertical-align: middle; color: #555; max-width: 300px; white-space: nowrap; }', ind++);


    cssInserted = true;
  };

  var __overflow = false;
  var showPopup = function(title, html, onsave) {
    T.insertCSSRules();
    if (__overflow === false) {
      __overflow = document.body.style.overflowY;
    }
    document.body.style.overflowY = 'hidden';
    var popup = {
      el: document.createElement('div'),
      save: onsave
    };
    popup.el.className = 'tjs-popup';
    popup.el.innerHTML = 
      '<div class="tjs-box"><div class="tjs-box-head">' + title + '</div>' +
        '<div class="tjs-box-body">' + html + '</div>' +
        '<div class="tjs-box-footer">' +
          '<div class="tjs-button" onclick="T.closePopup(' + popups.length + ', false);">' + T('$T.Cancel!') + '</div>' +
          '<div class="tjs-button" onclick="T.closePopup(' + popups.length + ', true);">' + T('$T.ok!') + '</div>' +
          '<div style="clear: both"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(popup.el);
    for (var i = 0; i < popups.length; i++) {
      if (!popups[i].closed) {
        popups[i].el.style.display = 'none';
      }
    }
    popups.push(popup);
    return popup;
  };

  T.closePopup = function(index, save) {
    var popup = popups[index];
    popup.closed = true;
    if (save && popup.save) {
      popup.save();
    }
    document.body.removeChild(popup.el);
    for (var i = popups.length - 1; i >= 0; i--) {
      if (!popups[i].closed) {
        popups[i].el.style.display = 'block';
        return;
      }
    }
    document.body.style.overflowY = __overflow;
  }

  T.showKey = function(key, e) {
    // show popup for editing key
    var l = lang;
    var id = popups.length;
    var cur = langs[l];
    var path = key.split('.');
    for (var i = 0; i < path.length; i++) {
      cur = cur[path[i].toLowerCase()];
    }
    var html = [];
    var subkeys = [];
    function buildList(keys, path, desc) {
      if (typeof keys == 'string') {
        if (desc.length) {
          desc[0] = desc[0][0].toLocaleUpperCase() + desc[0].substr(1);
        }
        html.push('<p>' + (desc.length ? desc.join(', ') : T('$T.popup.Value!')) + ':</p>');
        html.push('<div class="tjs-editor" id="tjs-editor-' + id + '-' + subkeys.length + '" contentEditable="true"></div>');
        subkeys.push({
          path: path,
          id: 'tjs-editor-' + id + '-' + subkeys.length,
          val: keys,
        });
        return;
      }
      if (typeof keys != 'object') {
        return;
      }
      var parse = false;
      if (keys.$plural) {
        keys = keys.$plural;
        path = path + '.$plural';
        parse = true;
      }
      if (keys.$gender) {
        keys = keys.$gender;
        path = path + '.$gender';
        parse = true;
      }
      for (var k in keys) {
        var nm = (['nom', 'gen', 'dat', 'acc', 'ins', 'abl'].indexOf(k) > -1 || parse) ? T('$T.popup.' + k + '!') : ('<b>' + k + '</b>');
        buildList(keys[k], path + '.' + k, desc.concat(nm));
      }
    }
    buildList(cur, key, []);
    showPopup(T('$T.popup.Key!', key.toLowerCase()), html.join(''), function() {
      var update = {};
      update[l] = {};

      for (var i = 0; i < subkeys.length; i++) {
        var path = subkeys[i].path.split('.');
        var cur = update[l];
        var obj = langs[l];
        for (var i = 0; i < path.length - 1; i++) {
          cur = cur[path[i].toLowerCase()] = {};
          obj = obj[path[i].toLowerCase()];
        }
        var newval = document.getElementById(subkeys[i].id).innerText;
        cur[path[path.length - 1].toLowerCase()] = 
          obj[path[path.length - 1].toLowerCase()] = newval;
      }

      callListeners(update);
    });
    for (var i = 0; i < subkeys.length; i++) {
      document.getElementById(subkeys[i].id).innerText = subkeys[i].val;
    }
    document.getElementById(subkeys[0].id).focus();
    
    if (e) {
      e.cancelBubble = true;
      e.stopPropagation && e.stopPropagation();
      return false;
    }
  };

  T.showAllKeys = function(section) {
    // show popup with all keys
    var l = lang;
    var id = popups.length;
    var cur = langs[l];
    if (section) {
      var path = section.split('.');
      for (var i = 0; i < path.length; i++) {
        cur = cur[path[i].toLowerCase()];
      }
    }
    function buildList(keys, path) {
      var html = ['<ul class="tjs-keys">'];
      for (var k in keys) {
        if (typeof keys[k] == 'function') {
          continue;
        } 
        var leaf = false;
        if (typeof keys[k] == 'string') {
          leaf = true;
        }
        if (typeof keys[k] == 'object') {
          if (keys[k].$plural || keys[k].$gender) {
            leaf = true;
          } else {
            leaf = true;
            for (var sk in keys[k]) {
              if (['nom', 'gen', 'dat', 'acc', 'ins', 'abl'].indexOf(sk) == -1) {
                leaf = false;
                break;
              }
            }
          }
          if (!leaf) {
            html.push('<li><span class="tjs-section-name">' + k + '</span>' + buildList(keys[k], path + (path ? '.' : '') + k) + '</li>');
          }
        }
        if (leaf) {
          var fv = keys[k];
          ext: while (typeof fv != 'string') {
            for (sk in fv) {
              fv = fv[sk];
              continue ext;
            }
            break;
          }
          if (typeof fv != 'string') {
            fv = false;
          }
          html.push('<li><span class="tjs-key-name" onclick="T.showKey(\'' + path + (path ? '.' : '') + k + '\');">' + k + '</span>' + (fv ? '<span class="tjs-key-val">(' + fv.replace(GT, '&gt;').replace(LT, '&lt;') + ')</span>' : '') + '</li>');
        }
      }
      html.push('</ul>');
      return html.join('');
    }
    showPopup(T('$T.popup.All!'), buildList(cur, section || ''), function() {
      var update = {};
      update[l] = {};
      var path = key.split('.');
      var cur = update[l];
      for (var i = 0; i < path.length - 1; i++) {
        cur = cur[path[i].toLowerCase()] = {};
      }
      var newval = document.getElementById('tjs-editor-' + id).value;
      cur[path.pop().toLowerCase()] = newval;

      callListeners(update);
    });
  };

  T.inlineTranslation = function(_inline) {
    if (_inline === undefined) {
      return inline;
    } else {
      inline = _inline;
      if (inline) {
        T.insertCSSRules();
      }
    }
  };

  if (typeof exports !== 'undefined') {
    exports = T;
  } else {
    var root = (typeof self == 'object' && self.self == self && self) ||
               (typeof global == 'object' && global.global == global && global);
    root.T = T;
  }
})();