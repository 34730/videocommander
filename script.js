chrome.extension.sendMessage({}, function(response) {

  var settings = {
    togglePlayAndPauseKeyCode: 80,  // default: P
    jumpToBeginningKeyCode:    72,  // defualt: H
    jumpToEndKeyCode:          69,  // default: E
    rewindTimeKeyCode:         65,  // default: A
    advanceTimeKeyCode:        83,  // default: S
    speedDownKeyCode:          68,  // default: D
    speedUpKeyCode:            85,  // default: U
    resetSpeedKeyCode:         82,  // default: R
    partialLoopKeyCode:        76,  // default: L
    skipTimeAmount:             5,  // default: 5
  };

  chrome.storage.sync.get(settings, function(storage) {
    settings.togglePlayAndPauseKeyCode = Number(storage.togglePlayAndPauseKeyCode);
    settings.jumpToBeginningKeyCode    = Number(storage.jumpToBeginningKeyCode);
    settings.jumpToEndKeyCode          = Number(storage.jumpToEndKeyCode);
    settings.rewindTimeKeyCode         = Number(storage.rewindTimeKeyCode);
    settings.advanceTimeKeyCode        = Number(storage.advanceTimeKeyCode);
    settings.speedDownKeyCode          = Number(storage.speedDownKeyCode);
    settings.speedUpKeyCode            = Number(storage.speedUpKeyCode);
    settings.resetSpeedKeyCode         = Number(storage.resetSpeedKeyCode);
    settings.partialLoopKeyCode        = Number(storage.partialLoopKeyCode);
    settings.skipTimeAmount            = Number(storage.skipTimeAmount);
  });

  // Global variable
  var loopStatus = 0;
  var loopStart;
  var loopEnd;
  var loopTimeoutID;
  var flag = 0;

  // キーが押されたかどうかを判定
  document.addEventListener('keydown', function(event) {

    // 入力フォームにフォーカスがあるときはショートカットを無効化
    if ((document.activeElement.nodeName === 'INPUT'
    || document.activeElement.nodeName === 'TEXTAREA'
    || document.activeElement.getAttribute('type') === 'text')
    || document.activeElement.isContentEditable === true) {
      return false;
    } else {
      activeBlur();
    }

    // cmd, shift, ctrl, alt をエスケープ
    if (event.metaKey || event.shiftKey || event.ctrlKey || event.altKey) {
      return false;
    }

    // ショートカットキーから関数を呼び出す
    switch (event.keyCode) {
      // オプションで変更可能なキーコード
      case settings.togglePlayAndPauseKeyCode: togglePlayAndPause(); break; // default: P
      case settings.jumpToBeginningKeyCode:    jumpToBeginning();    break; // default: H
      case settings.jumpToEndKeyCode:          jumpToEnd();          break; // default: E
      case settings.rewindTimeKeyCode:         rewindTime();         break; // default: A
      case settings.advanceTimeKeyCode:        advanceTime();        break; // default: S
      case settings.speedDownKeyCode:          speedDown();          break; // default: D
      case settings.speedUpKeyCode:            speedUp();            break; // default: U
      case settings.resetSpeedKeyCode:         resetSpeed();         break; // default: R

      // 固定のキーコード
      case 32: event.preventDefault(); togglePlayAndPause(); break; // space
      case 37:                         rewindTime();         break; // left-arrow
      case 39:                         advanceTime();        break; // right-arrow
      case 27:                         activeBlur();         break; // esc
    }

    // 数字のキーを押すとその数字に対応する割合まで動画を移動する
    // キーボードの 3 を押すと動画全体の 30% の位置に移動する
    // 固定のキーコード
    if (event.keyCode >= 48 && event.keyCode <= 57) {
      jumpToTimerRatio(event.keyCode);
    }

    // 部分ループ再生のステータスを記録
    // オプションで変更可能なキーコード
    // default: R
    if (event.keyCode == settings.partialLoopKeyCode) {
      if (loopStatus === undefined) {
        loopStatus = 0;
      }
      loopStatus++;
      partialLoop();
    }

  });

  // 再生/停止
  function togglePlayAndPause() {
    var player = document.getElementsByTagName('video')[0];
    if (player.paused === true)
      player.play();
    else
      player.pause();
    scrollToPlayer();
  };

  // 数秒巻き戻し
  function rewindTime() {
    document.getElementsByTagName('video')[0].currentTime -= settings.skipTimeAmount;
    scrollToPlayer();
  };

  // 数秒早送り
  function advanceTime() {
    document.getElementsByTagName('video')[0].currentTime += settings.skipTimeAmount;
    scrollToPlayer();
  };

  // 再生スピードダウン
  function speedDown() {
    var player = document.getElementsByTagName('video')[0];
    player.playbackRate = floorFormat((player.playbackRate - 0.09), 1);
    statusBox(player.playbackRate.toFixed(1));
    scrollToPlayer();
  }

  // 再生スピードアップ
  function speedUp() {
    var player = document.getElementsByTagName('video')[0];
    player.playbackRate = floorFormat((player.playbackRate + 0.11), 1);
    statusBox(player.playbackRate.toFixed(1));
    scrollToPlayer();
  }

  // 再生スピードリセット
  function resetSpeed() {
    var player = document.getElementsByTagName('video')[0];
    player.playbackRate = 1.0;
    statusBox(player.playbackRate.toFixed(1));
    scrollToPlayer();
  }

  // 動画の最初の位置に移動する
  function jumpToBeginning() {
    var player = document.getElementsByTagName('video')[0];
    player.currentTime = player.seekable.start(0);
    scrollToPlayer();
  };

  // 動画の最後の位置に移動する
  function jumpToEnd() {
    var player = document.getElementsByTagName('video')[0];
    player.currentTime = player.seekable.end(0);
    scrollToPlayer();
  };

  // 数字に対応する割合まで動画を移動する
  function jumpToTimerRatio(timerRatio) {
    var player = document.getElementsByTagName('video')[0];
    timerRatio = (timerRatio - 48) / 10;
    player.currentTime = player.seekable.end(0) * timerRatio;
    scrollToPlayer();
  };

  // 部分ループ再生
  function partialLoop() {
    var player = document.getElementsByTagName('video')[0];
    if (loopStatus === 1) {
      loopStart = player.currentTime;
      statusBox('Set');
    }
    else if (loopStatus === 2) {
      if (flag !== 1) {
        loopEnd = player.currentTime;
        flag = 1;
        statusBox('Loop!');
      }
      loopTimeoutID = setTimeout(function() {
        if (player.currentTime >= loopEnd || player.currentTime < loopStart) {
          player.currentTime = loopStart;
        }
        if (loopStatus === 3) {
          clearTimeout(loopTimeoutID);
          loopStatus = 0;
          flag = 0;
          statusBox('Restore');
          return false;
        }
        partialLoop();
      }, 100);
    }
  };

  // アクティブフォーカスを外す
  function activeBlur() {
    document.activeElement.blur();
  };

  // 小数点第(n+1)位を切り捨てて小数点第n位まで求める
  function floorFormat(number, n) {
    var _pow = Math.pow(10, n);
    return Math.floor(number * _pow) / _pow;
  };

  // 動画プレイヤーのある位置までスクロールする
  function scrollToPlayer() {
    var player = document.getElementsByTagName('video')[0];
    var rect = player.getBoundingClientRect();
    var positionY = rect.top;
    var dElm = document.documentElement;
    var dBody = document.body;
    var scrollY = dElm.scrollTop || dBody.scrollTop;
    var y = positionY + scrollY - 100;
    window.scrollTo(0, y);
  };

  // 部分ループ再生のステータスを表示する
  function statusBox(status) {
    var videoStatus = '<span class="video-status">' + status + '</span>';

    $('.video-status').remove();

    $(videoStatus).insertBefore('video');

    if (status !== 'Set') {
      $('.video-status').fadeOut(1000, function() {
        $(this).remove();
      });
    }
  }

});
