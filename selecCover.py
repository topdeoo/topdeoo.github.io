cover_list = [
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/n-buna.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/default.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1190408.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1150451.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1069101.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803170527.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803170433.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230724204246.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/BV1im4y177aW.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803170149.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803165842.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803165920.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803165900.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803170014.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803170052.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803170207.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803170225.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230803170258.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230627230306.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/658268.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230628184041.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/644887.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/831074.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/684458.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1311817.jpg"
]

import hashlib
import datetime


if __name__ == '__main__':
    t = datetime.datetime.now()
    md5_value = hashlib.md5(str(t).encode('utf-8')).hexdigest()
    idx = 0
    for i in range(len(md5_value)):
        idx += int(ord(md5_value[i]))
    print(cover_list[idx % len(cover_list)])
