# 加油預定表 API
### 只有get，不能編輯
### http://10.110.196.72:6767/FastAPI/berth-activities

### 回傳json
```
{
  "data": [
    {
      "ship": "A",
      "MFO180": 150,
      "MFO380": 0,
      "MGO": 20,
      "activity": [
        {
          "berthId": "25",
          "actStart": "2026-04-01T06:00:00+08:00",
          "actEnd": "2026-04-02T11:00:00+08:00"
        },
        {
          "berthId": "18",
          "actStart": "2026-04-02T12:00:00+08:00",
          "actEnd": "2026-04-03T06:00:00+08:00"
        }
      ]
    },
    {
      "ship": "B",
      "MFO180": 100,
      "MFO380": 0,
      "MGO": 25,
      "activity": [
        {
          "berthId": "4045",
          "actStart": "2026-04-02T09:30:00+08:00",
          "actEnd": "2026-04-04T12:30:00+08:00"
        }
      ]
    },
    {
      "ship": "C",
      "MFO180": 0,
      "MFO380": 750,
      "MGO": 30,
      "activity": [
        {
          "berthId": null,
          "actStart": "2026-04-02T12:00:00+08:00",
          "actEnd": null
        }
      ]
    }
  ]
} 
```

### http://10.110.196.72:6767/FastAPI/blocked-ranges

### 回傳 json
```
{
  "data": [
    {
      "type": "site",
      "category": "保養",
      "id": null,
      "start": "2026-04-01T08:00:00+08:00",
      "end": "2026-04-01T12:00:00+08:00"
    },
    {
      "type": "site",
      "category": "故障",
      "id": null,
      "start": "2026-04-10T16:00:00+08:00",
      "end": "2026-04-10T18:00:00+08:00"
    },
    {
      "type": "barge",
      "category": "保養",
      "id": "11",
      "start": "2026-04-05T08:00:00+08:00",
      "end": "2026-04-05T16:00:00+08:00"
    }
  ]
}
```