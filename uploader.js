//todo 增加删除当前文件的功能，注意要使用到token，防止删除非自己当前上传的文件
/*
 * 用例：
 * #) 你的form内放置一个input，如:
 * <input type="hidden" name="head_pic" data-config="max:1,thumb:0,water:0,text:'选择图片'" value="<?php echo htmlspecialchars($std->head_pic);?>" class="jsUploadFile" />
 * #) 给input加上class="jsUploadFile",这样会自动生成上传控件。点击就会打开上传对话框
 * #) 给input加上属性data-config=""，多个用逗号分隔，可组合的值有：
 *             // 最多上传数量
 *             max: 1,
 *            // 允许上传的类型属性,如jpg|zip
 *            ext: 'jpg',
 *            // 允许上传大小,用byte字节表示
 *            byte: 1024 * 1024 * 2,
 *            // 缩略图属性，值可以有false，scale原比例缩放，square 正方形缩放
 *            thumb: false,
 *            // 是否生成水印key，0无，1有
 *            water: 0,
 *            // 点击选择图片上传的按钮文本
 *            text: '选择图片'
 *
 * 拖动上传后的图片来排序
 * 通过 $(document).on('uploader',function (event, data) 监听事件； data.type区分事件类型
 */
// define(['jqueryUi'], function($) {
var mod = {};
var eventFn = {};
var M = {
    // 添加上传文件的触发按钮的css类名
    addBtnClass: '.jsUploadFile',
    callbackName: 'uploaderCallbacker',
    mimes: {
        'aplication/zip': 'zip',
        'image/gif': 'gif',
        'image/jpeg': 'jpg',
        'application/zip': 'zip',
        'application/octet-stream': 'zip',
        'application/x-zip-compressed': 'zip'
    },
    // 事件的名称
    eventName: 'uploader',
    index: 0
};

/*
 * 计算机容量单位与字节相互转换 注意SI计算机容量单位以1000一级，IEC才是1024，一般叫MiB，不是MB $input
 * string|float 100MB 1000 $isByte bool 输入是字节， @return string
 */
function sizeByte($input, $isByte, $typeSI) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB',
        'BB'
    ];
    $step = $typeSI ? 1000 : 1024;

    if ($isByte) {
        $steps = 0;
        while ($input >= $step) {
            $input = $input / $step;
            $steps++;
        }
        return String($input).replace(/^(\d+\.\d{2})\d+$/, '$1') +
            $units[$steps];
    }

    $unit = $input.toUpperCase().replace(/[\d\.]/g, '');
    var key = -1;
    for (var i = 0; i < $units.length; i++) {
        if ($units[i] == $unit) {
            key = i;
            break;
        }
    }
    if (key < 0) {
        return '0';
    }

    return $input.replace(/[a-z]/ig, '') * Math.pow($step, i);
}

/**
 * 组织input的值
 */
function setInputVal() {
    var input = this;
    var cfg = getConfig(input);
    var val = [];
    // 本上传盒子内的图片
    var files = input.parent().parent('i.uploaderWrap').find('i.jsMove');

    if (cfg.valueIsJson) {
        // 存的是json的格式
        files.each(function() {
            val.push($(this).attr('data-json'));
        });

        //就算是0|1个也是一个数组
        val = '[' + val.join(',') + ']';
    } else {
        //  通用的“src##名称#|下一个文件”格式
        files.each(function() {
            val.push($(this).attr('data-src') + '##' + $(this).attr('data-name'));
        });
        val = val.join('#|');
        //去掉换行
        val.length && val.replace(/[\r\t\n]/g, '');
    }

    input.val(val);
}

/**
 * 删除图片
 */
function delImg() {
    var deler = $(this);
    var wrap = deler.parent().parent('i.uploaderWrap');
    var input = wrap.find('input');
    //删除img
    deler.parent('i.uItem').remove();
    var cfg = getConfig(input);
    // 减少已上传计数
    if (--cfg.count < cfg.max) {
        // 如果少于最大数，显示上传按钮
        wrap.find('a.jsClicker').show();
    }
    // 更新input值
    setInputVal.call(input);
    //触发删除事件
    fire({ type: 'delete', input: input });
}

/**
 * 获取wrap dom
 * @param child
 * @returns {*|jQuery}
 */
function getWrap(child) {
    var wrap = $(child).parent('i.uploaderWrap');
    return wrap;
}

/**
 * 上传图片
 */
function showAddFileDialog() {
    var cfg = this;

    if (!this.isOnce) {
        // 不是单次获取模式
        var wrap = getWrap(this);
        cfg = getConfig(wrap);
    }

    // 允许上传图片
    var allowJpg = ('|' + cfg.ext + '|').toLowerCase().indexOf('jpg') > -1;
    var jpgHtml = '';

    if (allowJpg) {
        jpgHtml = '<label><input type="checkbox" value="1" class="jpgOption" name="waterMark" ' +
            (cfg.water ? ' checked="checked" ' : '') + ' title="图片是否打水印:jpg类型原图才加,缩略图不加" />' +
            'jpg原图加水印</label>' +
            '<br><label><input type="checkbox" class="jpgOption"  ' + (cfg.thumb ? ' checked="checked" ' : '') +
            ' value="scale" name="imageThumb" />生成缩略图</label>';
    }

    // <input  type="file" name="file" accept-off="'
    // 这个特性在chrome好像会很久才会显示文件选择框,把这个限制去掉后,就会快很多,目前先允许选择,再对后缀做限制吧,因为文件比较多时过滤比较慢
    // +
    // getMime(allowExts) +
    // '" />' +
    var uploadBoard = '<form enctype="multipart/form-data" method="POST"' +
        ' action="/uploads/index?callback=' + M.callbackName + '"' +
        ' target="_hideFormIframe" class="fileUpload">' +
        '只允许选择以下类型文件：' + cfg.ext + '<br>' +
        '<input type="hidden" name="MAX_FILE_SIZE" value="' + cfg.byte + '" />' +
        '<input  type="file" name="file" /> <br>' +
        '<div class="jsTip"></div>' + jpgHtml +
        '</form>';

    var form = $(uploadBoard);
    var uploader = form.dialog({
        title: '文件上传操作面板',
        dialogClass: 'uploaderDialog',
        modal: 1,
        width: 'auto',
        close: function() {
            $(this).dialog('destroy');
        },
        buttons: [{
                text: '开始上传',
                className: 'doUpload',
                click: function() {
                    form.submit();
                }
            },
            {
                text: '放弃操作',
                click: function() {
                    $(this).dialog('destroy');
                }
            }
        ]
    });
    var file = form.find('input[name="file"]'),
        submitBtn = form.find('.doUpload'),
        waterInput = form.find('input.jpgOption'),
        tip = form.find('.jsTip');
    file.click(function() {
        if (M.uploading) {
            // 上传中不允许更换图片
            return false;
        }

        tip.html('');
    }).change(function() {
        // 是否jpg，禁、启水印功能
        /\.jpe?g$/i.test(file.val()) ? waterInput.removeAttr('disabled') : waterInput.attr('disabled', 'disabled');
        return isAllowExt();
    });

    function isAllowExt() {
        var ext = '|' + file.val().replace(/^[\s\S]+\.(\w+)/, '$1') + '|';

        if (('|' + cfg.ext + '|').indexOf(ext.toLowerCase()) < 0) {
            // 不允许的文件类型
            tip.html('请重新选择文件！只允许文件类型：' + cfg.ext);
            return false;
        }

        return true;
    }

    form.submit(function() {
        if (M.uploading) {
            return false;
        }

        tip.html('');

        if (!file.val()) {
            tip.html('请选择上传文件');
            return false;
        }

        var files = file.get(0).files;

        if (files && (files = files[0])) {
            if (!files.size) {
                tip.html('空白文件不允许上传');
                return false;
            }

            if (files.size > cfg.byte) {
                var maxB = sizeByte(cfg.byte, 1);
                var sizeB = sizeByte(files.size, 1);
                tip.html('你选择的文件大小【' + sizeB + '】超过允许上传的大小【' + maxB + '】');
                return false;
            }

        }

        if (!isAllowExt()) {
            return false;
        }

        M.uploading = 1;
        submitBtn.val('上传中...请稍候');
        return true;
    });
    // 上传成功
    window[M.callbackName] = function(any, error) {
        delete M.uploading;
        submitBtn.val('开始上传');

        if (error) {
            return tip.html(any);
        }

        form.dialog('destroy');

        if (cfg.isOnce) {
            // 单次获取模式,上传成功把信息返回给调用者自己处理即可,通知方式是通过给document发送事件
            fire({ type: 'success', data: any });
        } else {
            render(wrap, any);
        }
    }
}

/**
 * 合并和设置input的配置
 * @param input
 * @returns {*}
 */
function getConfig(input) {
    if ('input' !== String($(input).prop('tagName')).toLowerCase()) {
        input = $(input).find('input');
    }

    if (!input.length) {
        return null;
    }

    var cfg = {
        // 最多上传数量
        max: 1,
        //  已上传的数量
        count: 0,
        // 允许上传的类型属性key,如jpg|zip
        ext: 'jpg',
        // 允许上传大小,用byte字节表示
        byte: 1024 * 1024 * 2,
        // 缩略图属性，值可以有false，scale原比例缩放，square 正方形缩放
        thumb: false,
        // 是否生成水印key，0无，1有
        water: 0,
        // 点击选择图片上传的按钮文本
        text: '选择图片',
        // 最外容器的class，如果需要控制，请加
        wrapClass: '',
        // 是否一初始化就显示选择文件面板
        isShow: false,
        // 指定input 的value存的是“src##名称#|下一个文件”还是一个json
        valueIsJson: false
    };

    if ($(input).prop('uploaderConfig')) {
        return $(input).prop('uploaderConfig');
    }

    var inputCfg = new Function("", "try{return {" + $(input).attr('data-config') + "};}catch(e){return {};}")();
    cfg = $.extend(cfg, inputCfg); //console.log(cfg,inputCfg);

    if (!/^(?:jpg|zip|gif|mp3)+(?:\|(?:jpg|zip|gif|mp3))*$/.test(cfg.ext)) {
        // 防止指定不允许的类型
        cfg.ext = 'jpg';
    }

    $(input).prop('uploaderConfig', cfg);
    return cfg;
}

/**
 * 通过事件显示选择文件面板
 * @param event
 * @param data
 */
eventFn.showAddFileDialog = function(event, data) {
    var input = $(data.input);
    showAddFileDialog.apply(input.parent('a.jsClicker').get(0), arguments);
};

/**
 * 初始化图片上传对象
 * @param event
 * @param data
 */
eventFn.init = function(event, data) {
    var input = $(data.input);

    if (!input.length) {
        throw new Error('缺少input dom');
    }

    if ('yes' === input.attr('data-inited')) {
        // 防止多次初始化
        return;
    }

    input.attr('data-inited', 'yes');
    var cfg = getConfig(input);
    var wrapClass = cfg.wrapClass || '';
    var wrap = $('<i class="uploaderWrap ' + wrapClass + '"><a href="javascript:void(0);" class="upBtn jsClicker">' + cfg.text + '</a></i>');
    input.wrap(wrap);
    // xx.jpg##描述描述#|x2.jpg##描述2
    var imgs = input.val().split('#|');

    for (var i = 0; i < imgs.length; i++) {
        var img = $.trim(imgs[i]);
        if (!/\/[^\/]+\.\w+/.test(img)) continue;
        img = img.split('##');
        render(input.parent().parent(), { relativeSrc: img[0], name: img[1] || '' });
    }

    if (cfg.isShow) {
        // 如果要求初始化就显示选择面板
        fire({ type: 'showAddFileDialog', input: input });
    }

    input.hide();
};

/**
 * 渲染html
 * @param wrap
 * @param obj
 */
function render(wrap, obj) {
    var isImg = /\.(jpg|gif|png)$/i.test(obj.relativeSrc);
    var json = '';

    if (!window.JSON) {
        alert('您的浏览器不支持，请升级');
    } else {
        json = JSON.stringify(obj);
    }

    var tpl = '<i class="uItem jsItem">' +
        '<i class="uImgBox jsMove" onclick=\'window.open("${relativeSrc}");\' data-json="" data-path="${relativePath}" data-src="${relativeSrc}" data-name="${name}" title="点击预览\n拖动改变排序">';

    if (isImg) {
        tpl += '<img class="uImg" src="${relativeSrc}"/>';
    } else {
        tpl += '<svg class="fileSvg uImg" role="img">' +
            '<use xlink:href="#fileSvg"></use>' +
            '</svg>';
    }

    tpl += '</i><textarea placeholder="输入描述" title="请输入文件描述" class="uAlt">${name}</textarea>' +
        '<a class="uDelete jsDel" href="javascript:;" title="删除">x</a>' +
        '</i>';
    // 处理模板
    for (var key in obj) {
        tpl = tpl.replace(new RegExp('\\$\\{' + key + '\\}', 'g'), obj[key]);
    }

    // 删除不存在的key
    tpl = tpl.replace(/\$\{[^\$\{\}]+\}/g, '');
    tpl = $(tpl);
    //使用这种方式，防止因为json有特殊html而出错
    tpl.find('i.jsMove').attr('data-json', json);
    var uploadA = wrap.find('a.jsClicker');
    uploadA.before(tpl);
    var cfg = wrap.find('input').prop('uploaderConfig');

    if (++cfg.count >= cfg.max) {
        // 如果上传数量已经达到最大数量，要隐藏上传按钮
        wrap.find('a.jsClicker').hide();
    }

    var input = wrap.find('input');
    setInputVal.call(input);
    // 通知其它处理上传成功事件
    fire({ type: 'success', input: input, which: tpl, data: obj });
}

/**
 * alt文字变化了
 */
function altChange() {
    var wrap = getWrap(this);
    var item = $(this).parent('i');
    item.find('i.jsMove').attr('data-name', this.value);
    var input = item.parent().find('input');
    setInputVal.call(input);
    fire({ type: 'rename', input: input, which: item });
}

var style = '<style>' +
    'form.fileUpload{line-height:200%;}' +
    'form.fileUpload .jsTip{color:red;}' +
    '.uploaderWrap{display: inline-block;}' +
    '.uploaderWrap input{display: none;}' +
    '.uploaderWrap i.uItem{position: relative;display: inline-block;margin:0 26px 50px 0;font-style: normal;}' +
    '.uploaderWrap i.uImgBox{display:inline-block;cursor: pointer;}' +
    '.uploaderWrap img.uImg{width:100px;height:100px;}' +
    '.uploaderWrap svg.uImg{width:50px;height:50px;}' +
    '.uploaderWrap .uAlt{resize:none;position: absolute;width:100%;height:36px;left:0;bottom:-36px;font-size:11px;line-height: 11px;background: white;color:black;border: 1px solid #ddd;overflow: hidden;word-break: break-all; }' +
    '.uploaderWrap a.uDelete{position: absolute;top:-10px;right:-10px;height:20px;width:20px;display: block;font-size: 20px;line-height: 20px;text-align: center;vertical-align: middle;color: white;font-weight: bold;border-radius: 50%;background:red;opacity: 0.7;}' +
    'iframe.uploader{display: none;}' +
    '</style>' +
    '<iframe name="_hideFormIframe" class="uploader"><!--不能写src，否则firefox会在新窗口打开--></iframe>';


/**
 * 触发事件
 * @param data
 * @returns {*|jQuery}
 */
function fire(data) {
    return $(document).triggerHandler('uploader', data);
}

$(document)
    .delegate('.uploaderWrap a.jsDel', 'click', delImg)
    .delegate('.uploaderWrap a.jsClicker', "click", showAddFileDialog)
    .delegate('.uploaderWrap textarea.uAlt', 'keyup change paste', altChange)
    .bind('uploader', function(event, data) {
        // 事件只有一个，通过data.type来区分
        if (!data) {
            throw new Error('请传递有效的事件data对象');
        }

        if ('function' !== typeof eventFn[data.type]) return false;
        return eventFn[data.type].apply(this, arguments);
    });

// 这个要放到最后，否则上面的事件来不及
$(function() {
    // 移动排序
    $('body').sortable({
        handle: 'i.jsMove',
        items: 'i.jsItem',
        update: function(event, ui) {
            var input = getWrap(ui.item).find('input');
            setInputVal.call(input);
        }
    }).append(style);
    // 支持普通html存在的使用方式：页面加载成功主动初始化
    $(M.addBtnClass).each(function() {
        // 支持动态创建dom的方式类似这样使用：创建成功使用事件通知方式
        fire({ type: 'init', input: this });
    });
});


/**
 * 对于每次只需要得到上传成功后的图片url的业务，可以调用这个接口得到url，不需要按常规来初始化
 * 单次获取模式,上传成功把信息返回给调用者自己处理即可,通知方式是通过给document发送uploader,{type:'success'}事件
 * @param event
 * @param cfg
 */
eventFn.showFileDialog = function(event, cfg) {

    if ('object' !== typeof cfg) {
        return alert('单次获取上传文件url的方式，需要提供配置对象');
    }

    // 单次获取模式
    cfg.isOnce = 1;
    showAddFileDialog.apply(cfg);
};

//支持用时加载方式
mod.hash_index = function() {
    var dom = $(this);

    if (!dom.hasClass('jsClickRunApi')) {
        // 只支持这种触发的方式， 注意这个对象必须是input
        return false;
    }
    // 点击了，就把这个对象当做对象了
    fire({ type: 'init', input: this });
};
// return mod;
// });