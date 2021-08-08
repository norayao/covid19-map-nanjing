// Navigator 对象包含一些有关浏览器的信息，
// userAgent是该对象的一个只读属性，声明了浏览器用于 HTTP 请求的用户代理头的值
// 通过判断navigator.useragent里面是否有某些值来判断当前的客户端是什么状态
const isMobile = /Android|webOS|iPhone|iPad|BlackBerry/i.test(navigator.userAgent);
// console.log(isMobile)

// 设置获取今日和昨日的数据
Date.prototype.format = function (fmt) {
    let o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (let k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
let set_yesterday = new Date();
set_yesterday.setDate(set_yesterday.getDate() -2);
let yesterday = set_yesterday.format("yyyy-MM-dd");

let set_today = new Date();
set_today.setDate(set_today.getDate()-1);
let today= set_today.format("yyyy-MM-dd");

let set_curr = new Date();
set_curr.setDate(set_curr.getDate());
let curr = set_curr.format("yyyy-MM-dd");

let $info = $("#info");
let $tip = $('#tip');
let $update = $(`<div id="update"></div>`);
$info.append($update);
$update.append(`<p>数据最后更新时间: </p>`);
$update.append(`<p>${curr}</p>`)
$update.append(`<p>Copyright © 2021 norayao</p>`)


// 百度地图
const map = new BMap.Map("container", {drawMargin: 100, drawer: BMAP_SVG_DRAWER_FIRST });

// 中心点坐标
let centre_point = new BMap.Point(118.779425,31.939229);
// 设置中心点和缩放尺度
map.centerAndZoom(centre_point, 10);

map.addControl(new BMap.NavigationControl({type: BMAP_NAVIGATION_CONTROL_SMALL}));
map.enableScrollWheelZoom();

const infection = () => {
    return new Promise(resolve => {
        $.ajax({
            url: 'data/infection.json',
            dataType: 'json',
            success(result) {
                resolve(result);
            }
        });
    });
};
const risk = () => {
    return new Promise(resolve => {
        $.ajax({
            url: 'data/risk.json',
            dataType: 'json',
            success(result) {
                resolve(result);
            }
        });
    });
};
(async function () {
    // 获取感染区域数据
    let r1 = await infection();
    let districts = r1[Object.keys(r1)[0]];
    // console.log('第一次请求->', r1);
    // console.log(districts);

    // 获取风险地区数据
    let r2 = await risk();
    let middle = r2['中风险'];
    let high = r2['高风险'];
    let total = r2['总计'];
    // console.log('第二次请求->', r2);
    // console.log(middle,high);


    // 定位所在地并显示坐标
    const geolocation = new BMap.Geolocation();
    const icon_marker = new BMap.Icon("img/marker.png", new BMap.Size(40, 42));
    //创建地理编码器
    const gc = new BMap.Geocoder();
    // 开启SDK辅助定位
    geolocation.enableSDKLocation();
    geolocation.getCurrentPosition(function(r){
        if(this.getStatus() === BMAP_STATUS_SUCCESS){
            let mk = new BMap.Marker(r.point,{icon: icon_marker});
            map.addOverlay(mk);
            map.panTo(r.point);
            // alert('您的位置：' + r.point.lng + ',' + r.point.lat);

            let pt = r.point;
            map.panTo(pt);//移动地图中心点
            console.log(map.pointToPixel(pt));

            gc.getLocation(pt, function(rs){
                let addComp = rs.addressComponents;
                let curr_district = addComp.district;
                let current_value = districts[curr_district] === undefined ? 0 : districts[curr_district];
                let high_risk_num = high[current_value] === undefined ? 0 : Object.keys(high[current_value]).length;
                let middle_risk_num = middle[current_value] === undefined ? 0 : Object.keys(middle[current_value]).length;

                alert(`${addComp.city} ${addComp.district}\n确诊：${current_value}\n高风险：${high_risk_num}\n中风险：${middle_risk_num}\n请点击对应区域查看具体风险地区`);

                // alert(addComp.province + addComp.city + addComp.district + addComp.street + addComp.streetNumber);
            });
        }
        else {
            alert('failed'+this.getStatus());
        }
    });
    let $info = $("#info");
    let $risk = $("#risk");
    let $infection = $("#infection");

    // PC 右侧浮窗显示风险地区
    let $high_risk = $(`<h5 id="high-risk">高风险地区</h5>`);
    $risk.append($high_risk);
    let $middle_risk = $(`<h5 id="middle-risk">中风险地区</h5>`);
    $risk.append($middle_risk);

    for(let each_high in high){
        let district = each_high;
        let num = Object.keys(high[each_high]).length;
        $high_risk.after(`<span>${district}: ${num}个</span>`)
    }

    for(let each_middle in middle){
        let district = each_middle;
        let num = Object.keys(middle[each_middle]).length;
        $middle_risk.after(`<span>${district}: ${num}个</span>`);
    }

    // Mobile 顶部显示感染和风险地区
    let total_infection = districts['总计'];
    let total_high_area = total['高风险'];
    let total_middle_area = total['中风险'];
    let $total_num = $('#total-num');
    let $total_high = $('#total-high');
    let $total_middle = $('#total-middle');

    $total_num.text(total_infection);
    $total_high.text(total_high_area);
    $total_middle.text(total_middle_area);


    // 根据感染数对区域排序
    const sort_districts = Object.keys(districts).sort(function(a,b){return districts[b]-districts[a]});

    for(let each_district in sort_districts){

        // 完整行政区划名
        let district_name = sort_districts[each_district]
        let district_fullname = "南京市" + district_name;

        let current_value = districts[district_name];
        let high_risk_num = high[district_name] === undefined ? 0 : Object.keys(high[district_name]).length;
        let middle_risk_num = middle[district_name] === undefined ? 0 : Object.keys(middle[district_name]).length;
        let current_area = high_risk_num + middle_risk_num;
        console.log(district_name,current_area)


        if (!isMobile){
            // PC 右侧浮窗显示当前感染人数
            let $district_infection = $(`<span id="district-name">${district_name}: ${current_value}例</span>`)
            $infection.append($district_infection);
        }

        // 开始绘制行政区划
        // 地图色块显示
        let district_opacity = 0.7;
        let district_color = '';
        let boundary_color = ''



        if (current_area === 0){
            district_color = "#b0e2c3";
            boundary_color = "#147430";
        }
        else if (current_area >= 1 && current_area < 2){
            district_color = "rgb(255,211,134)";
            boundary_color = "#c46640";
        }
        else if (current_area >= 2 && current_area < 4){
            district_color = "#ff8b4f";
            boundary_color = "#de7040";
        }
        else if (current_area >=4 && current_area < 6){
            district_color = "#c46640";
            boundary_color = "#931c0d";
        }
        else{
            district_color = "#cb2823";
            boundary_color = "#82110d";
        }


        // 获取行政区域
        let boundary = new BMap.Boundary();
        boundary.get(district_fullname, function(result){
            // 行政区域的点有多少个
            let count = result.boundaries.length;


            //建立多边形覆盖物
            for(let i = 0; i < count; i++){
                let ply = new BMap.Polygon(result.boundaries[i], {strokeWeight: 2, strokeColor: boundary_color, fillColor: district_color, fillOpacity: district_opacity});

                function risks_append($element){
                    $element.append(`<h5>${district_name}</h5>`);
                    $element.append(`<span id="district-name">${district_name}: ${current_value}例</span>`);
                    let high_risk = high[district_name];
                    if (high_risk !== undefined){
                        for (let each_area in high_risk){
                            $element.append(`<span id="high-risk-tip">高风险：${high_risk[each_area]}</span>`);
                        }
                    }
                    let middle_risk = middle[district_name];
                    if (middle_risk !== undefined){
                        for (let middle_area in middle_risk){
                            $element.append(`<span id="middle-risk-tip">中风险：${middle_risk[middle_area]}</span>`);
                        }
                    }


                }
                function risks_remove($element){
                    $element.children('span').remove();
                    $element.children('h5').remove();
                }
                function display_tip(e, $element){
                    // let x = e.clientX - parseInt($tip.css("width")) ;
                    // let y = e.clientY- parseInt($tip.css("height"));

                    let x = e.pixel.x - parseInt($tip.css("width")) ;
                    let y = e.pixel.y- parseInt($tip.css("height"));

                    $element.attr('style', `margin-left: ${x}px; margin-top: ${y}px;`);
                }

                //添加覆盖物
                map.addOverlay(ply);
                if (isMobile === true){
                    map.addEventListener('click',(e) =>{
                        ply.customClickHandler_ = function() {
                            $tip.children('span').remove();
                            $tip.children('hr').remove();
                            $tip.append(`<span id="district-info">${district_name}：${current_value}例</span>`);

                            let high_risk_num = high[district_name] === undefined ? 0 : Object.keys(high[district_name]).length;
                            let middle_risk_num = middle[district_name] === undefined ? 0 : Object.keys(middle[district_name]).length;
                            $tip.append(`<span id="high-risk-area">高风险：${high_risk_num}</span>`);
                            $tip.append(`<span id="middle-risk-area">中风险：${middle_risk_num}</span>`)
                            $tip.append(`<hr>`)
                            let $more_info = $(`<span id="more-info">查看详细 > </span>`)
                            $tip.append($more_info)

                            // tip 显示的位置
                            let x = e.pixel.x;
                            let y = e.pixel.y;
                            $tip.attr('style', `margin-left: ${x}px; margin-top: ${y}px;`);

                            // 点击显示详细信息
                            $more_info.on('click', (e) =>{
                                $tip.children('span').remove();
                                $tip.children('hr').remove();

                                $current_area = $('#current-area');
                                risks_remove($current_area);

                                risks_append($current_area);
                                $current_area.attr('style','display: block;');
                                $close = $('#close-current-area');
                                $close.on('click', () => {
                                    $current_area.attr('style','display: none')
                                    risks_remove($current_area);
                                })

                            })
                        };
                        if(e.overlay && e.overlay.customClickHandler_) {
                            e.overlay.customClickHandler_.call(e.overlay, e);
                        }
                    })
                }
                else{

                    // 在指定位置显示当前地区疫情情况
                    ply.onmouseover = (e) =>{
                        risks_append($tip);
                        display_tip(e)
                    }
                    ply.onmouseout = () =>{
                        risks_remove($tip);
                    }
                    ply.onclick = (e) =>{
                        risks_remove($tip);
                        risks_append($tip);
                        display_tip(e,$tip)
                    }

                }


            }
        });
    }

})();




