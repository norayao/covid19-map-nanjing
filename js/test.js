const url = "data/infection.json"
const request = new XMLHttpRequest();
request.open("get", url);
request.send(null);
request.onload = function requestInfection() {
    if (request.status === 200) {
        // 获取区域数据
        let districts = JSON.parse(request.responseText)[today];
        const sort_districts = Object.keys(districts).sort(function (a, b) {
            return districts[b] - districts[a]
        });

        function getInfection(){
            return districts;
        }

        return getInfection();

    }
}
console.log(request.onload);