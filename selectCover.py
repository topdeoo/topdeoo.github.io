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
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/644887.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/831074.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/684458.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1311817.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230916163505.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230916163539.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230916163739.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230916163924.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230916164128.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230916164153.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230916164305.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230916164444.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/desktop3.png",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1336068.jpeg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1336671.webp",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1336369.jpeg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/IMG_4213(20231118-102632).webp",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711803296488.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711803211807.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711803110624.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/Acheron.jpeg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711802767058.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711802698151.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711802662756.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711802605292.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711802572281.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711802535376.jpg",
    "https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/1711802420249.jpg",
]

import hashlib
import datetime
import requests


if __name__ == "__main__":
    t = datetime.datetime.now()
    md5_value = hashlib.md5(str(t).encode("utf-8")).hexdigest()
    idx = 0
    for i in range(len(md5_value)):
        idx += int(ord(md5_value[i]))
    print(cover_list[idx % len(cover_list)])
