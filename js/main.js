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

$info = $("#info");
$update = $(`<div id="update"></div>`);
$info.append($update);
$update.append(`<p>数据最后更新时间: </p>`);
$update.append(`<p>${curr}</p>`)
$update.append(`<p>Copyright © 2021 norayao</p>`)


// 百度地图
const map = new BMap.Map("container");

// 中心点坐标
let centre_point = new BMap.Point(118.779425,31.939229);
// 设置中心点和缩放尺度
map.centerAndZoom(centre_point, 10);

map.addControl(new BMap.NavigationControl({type: BMAP_NAVIGATION_CONTROL_SMALL}));
map.enableScrollWheelZoom();

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

        // gc.getLocation(pt, function(rs){
        //     let addComp = rs.addressComponents;
        //
        //     alert(addComp.province + addComp.city + addComp.district + addComp.street + addComp.streetNumber);
        // });
    }
    else {
        alert('failed'+this.getStatus());
    }
});

// 开始绘制行政区划
let boundary = new BMap.Boundary();
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
    // console.log('第二次请求->', r2);
    // console.log(middle,high);
    let $high_risk = $("#high-risk");
    for(let each_high in high){

        let district = each_high;
        let num = Object.keys(high[each_high]).length;
        $high_risk.after(`<span>${district}: ${num}个</span>`)
    }
    let $middle_risk = $("#middle-risk");
    for(let each_middle in middle){
        let district = each_middle;
        let num = Object.keys(middle[each_middle]).length;
        $middle_risk.after(`<span>${district}: ${num}个</span>`);

    }
    // 根据感染数对区域排序
    const sort_districts = Object.keys(districts).sort(function(a,b){return districts[b]-districts[a]});

    for(let each_district in sort_districts){

        // 完整行政区划名
        let district_name = sort_districts[each_district]
        let district_fullname = "南京市" + district_name;

        let current_value = districts[district_name];

        // 右侧浮窗显示当前感染人数
        let $infection = $("#infection");
        let $district_infection = $(`<span id="district-name">${district_name}: ${current_value}例</span>`)
        $infection.append($district_infection);

        // 地图色块显示
        let district_opacity = 0;
        let district_color = '';
        let boundary_color = ''

        // 设置区域透明度
        if(current_value > 0){
            district_opacity = 0.7;
        }

        // 设置区域底色和边界颜色
        if (current_value >= 50){
            district_color = "#cb2823";
            boundary_color = "#82110d";
        }
        else if (current_value >= 15 && current_value < 50){
            district_color = "#c46640";
            boundary_color = "#931c0d";
        }
        else if (current_value >= 2 && current_value < 15) {
            district_color = "#ff8b4f";
            boundary_color = "#ba4813";
        }
        else if (current_value >= 1 && current_value < 2) {
            district_color = "rgb(255,211,134)";
            boundary_color = "#c46640";
        }
        else{
            district_color = "#b0e2c3"
            boundary_color = "#147430"
        }

        // 获取行政区域
        boundary.get(district_fullname, function(result){
            // 行政区域的点有多少个
            let count = result.boundaries.length;

            let $tip = $('#tip');

            //建立多边形覆盖物
            for(let i = 0; i < count; i++){
                let ply = new BMap.Polygon(result.boundaries[i], {strokeWeight: 2, strokeColor: boundary_color, fillColor: district_color, fillOpacity: district_opacity});
                //添加覆盖物
                map.addOverlay(ply);

                // 点击在指定位置显示当前地区疫情情况
                ply.onmouseover = (e) =>{
                    $tip.append(`<h5>${district_name}</h5>`);
                    $tip.append(`<span id="district-name">${district_name}: ${current_value}例</span>`);
                    let high_risk = high[district_name];
                    if (high_risk !== undefined){
                        for (let each_area in high_risk){
                            $tip.append(`<span id="high-risk-tip">高风险：${high_risk[each_area]}</span>`);
                        }
                    }
                    let middle_risk = middle[district_name];
                    if (middle_risk !== undefined){
                        for (let middle_area in middle_risk){
                            $tip.append(`<span id="middle-risk-tip">中风险：${middle_risk[middle_area]}</span>`);
                        }
                    }

                    // let x = e.clientX - parseInt($tip.css("width")) ;
                    // let y = e.clientY- parseInt($tip.css("height"));

                    let x = e.pixel.x - parseInt($tip.css("width")) ;
                    let y = e.pixel.y- parseInt($tip.css("height"));

                    $tip.attr('style', `margin-left: ${x}px; margin-top: ${y}px;`);

                }
                ply.onmouseout = () =>{
                    $tip.children('span').remove();
                    $tip.children('h5').remove();
                }
                ply.onclick = (e) =>{
                    $tip.children('span').remove();
                    $tip.children('h5').remove();
                    $tip.append(`<h5>${district_name}</h5>`);

                    $tip.append(`<span id="district-name">${district_name}: ${current_value}例</span>`);
                    let high_risk = high[district_name];
                    if (high_risk !== undefined){
                        for (let each_area in high_risk){
                            $tip.append(`<span id="high-risk-tip">高风险：${high_risk[each_area]}</span>`);
                        }
                    }
                    let middle_risk = middle[district_name];
                    if (middle_risk !== undefined){
                        for (let middle_area in middle_risk){
                            $tip.append(`<span id="middle-risk-tip">中风险：${middle_risk[middle_area]}</span>`);
                        }
                    }

                    // let x = e.clientX - parseInt($tip.css("width")) ;
                    // let y = e.clientY- parseInt($tip.css("height"));

                    let x = e.pixel.x - parseInt($tip.css("width")) ;
                    let y = e.pixel.y- parseInt($tip.css("height"));

                    $tip.attr('style', `margin-left: ${x}px; margin-top: ${y}px;`);

                }



            }

        });
    }


})();




