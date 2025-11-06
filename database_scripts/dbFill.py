import sys, requests, json, random, datetime

def create_user(base_url):
    name = f"User_{random.randint(1000, 9999)}"
    email = f"{name.lower()}@example.com"
    payload = {"name": name, "email": email}
    try:
        r = requests.post(f"{base_url}/api/users", json=payload)
        d = r.json()
        if d and isinstance(d, dict) and d.get("data") and isinstance(d["data"], dict):
            print(f"Created user: {d['data']['name']}")
            return d["data"]["_id"], d["data"]["name"]
        else:
            print("Skipping invalid user response:", d)
            return None, None
    except Exception as e:
        print("Error creating user:", e)
        return None, None


def create_task(base_url, user_ids, user_names):
    name = f"Task_{random.randint(1000, 9999)}"
    desc = f"Auto generated task for {name}"
    deadline = (datetime.datetime.now() + datetime.timedelta(days=random.randint(1, 30))).isoformat()
    completed = random.choice([True, False])
    
    # 60% chance of being assigned
    if user_ids and random.random() < 0.6:
        idx = random.randint(0, len(user_ids) - 1)
        assignedUser = user_ids[idx]
        assignedUserName = user_names[idx]
    else:
        assignedUser = ""
        assignedUserName = "unassigned"

    payload = {
        "name": name,
        "description": desc,
        "deadline": deadline,
        "completed": completed,
        "assignedUser": assignedUser,
        "assignedUserName": assignedUserName
    }

    try:
        r = requests.post(f"{base_url}/api/tasks", json=payload)
        d = r.json()
        if d and d.get("data"):
            print(f"Created task: {d['data']['name']}")
        else:
            print("Skipping invalid task response:", d)
    except Exception as e:
        print("Error creating task:", e)


def main(args):
    if len(args) < 6:
        print("Usage: python3 dbFill.py -u <url> -p <port> -n <num_users> -t <num_tasks>")
        return

    url = f"http://{args[1]}:{args[3]}"
    num_users = int(args[5])
    num_tasks = int(args[7]) if len(args) > 7 else 50

    print(f"Base URL: {url}")
    print(f"Creating {num_users} users")
    print(f"Creating {num_tasks} tasks")

    user_ids, user_names = [], []

    # Create users safely
    for _ in range(num_users):
        uid, uname = create_user(url)
        if uid and uname:
            user_ids.append(uid)
            user_names.append(uname)

    # Create tasks
    for _ in range(num_tasks):
        create_task(url, user_ids, user_names)

    print("\nDONE!")
    print(f"Users created: {len(user_ids)}")
    print(f"Tasks created: {num_tasks}")


if __name__ == "__main__":
    main(sys.argv[1:])
