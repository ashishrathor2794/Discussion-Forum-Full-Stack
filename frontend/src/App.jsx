import React from "react";
import { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import api, { SOCKET_URL } from "./api";

function Layout({ user, setUser }) {
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL);
    socket.emit("join", user.id);
    socket.on("notification", n => setNotice(n.message));
    return () => socket.disconnect();
  }, [user]);

  function logout() {
    localStorage.clear();
    setUser(null);
    navigate("/");
  }

  return (
    <>
      <header className="topbar">
        <Link className="brand" to="/">Discussion Forum</Link>
        <nav>
          <Link to="/">Home</Link>
          {user && <Link to="/create">New Discussion</Link>}
          {user && <Link to="/notifications">Notifications</Link>}
          {user ? (
            <>
              <span className="user-chip">{user.name} ({user.role})</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link className="button" to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>
      {notice && <div className="toast" onClick={() => setNotice(null)}>🔔 {notice}</div>}
    </>
  );
}

function Home({ user }) {
  const [data, setData] = useState({ threads: [], pages: 1, page: 1 });
  const [search, setSearch] = useState("");

  async function load(page = 1) {
    const res = await api.get(`/threads?page=${page}&search=${encodeURIComponent(search)}`);
    setData(res.data);
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="container">
      <section className="hero">
        <div>
          <h1>Ask. Discuss. Learn.</h1>
          <p>A community forum for questions, answers and useful discussions.</p>
        </div>
        {user && <Link className="button" to="/create">Start a discussion</Link>}
      </section>

      <form className="search" onSubmit={e => { e.preventDefault(); load(1); }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search discussions, tags or keywords..." />
        <button>Search</button>
      </form>

      <div className="thread-list">
        {data.threads.map(t => (
          <article className="card thread" key={t._id}>
            <div>
              <h2><Link to={`/threads/${t._id}`}>{t.title}</Link></h2>
              <p>{t.body.length > 180 ? t.body.slice(0, 180) + "…" : t.body}</p>
              <div className="meta">By {t.author?.name} · {new Date(t.createdAt).toLocaleDateString()}</div>
              <div>{t.tags?.map(tag => <span className="tag" key={tag}>#{tag}</span>)}</div>
            </div>
            <div className="score">
              <strong>{t.votes?.reduce((s, v) => s + v.value, 0) || 0}</strong>
              <span>votes</span>
            </div>
          </article>
        ))}
        {!data.threads.length && <div className="card">No discussions found.</div>}
      </div>

      <div className="pagination">
        <button disabled={data.page <= 1} onClick={() => load(data.page - 1)}>Previous</button>
        <span>Page {data.page} of {Math.max(data.pages, 1)}</span>
        <button disabled={data.page >= data.pages} onClick={() => load(data.page + 1)}>Next</button>
      </div>
    </main>
  );
}

function Auth({ mode, setUser }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post(`/auth/${mode}`, form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Request failed");
    }
  }

  return (
    <main className="form-page">
      <form className="card form" onSubmit={submit}>
        <h1>{mode === "login" ? "Login" : "Create account"}</h1>
        {mode === "register" && <input placeholder="Full name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />}
        <input type="email" placeholder="Email" required value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
        <input type="password" placeholder="Password (min 6 characters)" required value={form.password} onChange={e => setForm({...form, password:e.target.value})} />
        <button className="button full">{mode === "login" ? "Login" : "Register"}</button>
      </form>
    </main>
  );
}

function Create() {
  const [form, setForm] = useState({ title:"", body:"", tags:"" });
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post("/threads", {
        title: form.title,
        body: form.body,
        tags: form.tags.split(",").map(x => x.trim()).filter(Boolean)
      });
      navigate(`/threads/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Could not create discussion");
    }
  }

  return <main className="form-page"><form className="card form wide" onSubmit={submit}>
    <h1>Start a Discussion</h1>
    <input required placeholder="Discussion title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
    <textarea required rows="8" placeholder="Describe your question or topic..." value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/>
    <input placeholder="Tags (comma separated)" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/>
    <button className="button">Publish Discussion</button>
  </form></main>;
}

function ThreadPage({ user }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [reply, setReply] = useState("");

  async function load() {
    const res = await api.get(`/threads/${id}`);
    setData(res.data);
  }
  useEffect(() => { load(); }, [id]);

  async function vote(value) {
    if (!user) return alert("Please login to vote");
    await api.post(`/threads/${id}/vote`, { value });
    load();
  }

  async function addReply(e) {
    e.preventDefault();
    if (!user) return alert("Please login to reply");
    await api.post(`/threads/${id}/replies`, { body: reply });
    setReply("");
    load();
  }

  async function accept(replyId) {
    await api.post(`/threads/${id}/replies/${replyId}/accept`);
    load();
  }

  if (!data) return <main className="container">Loading...</main>;
  const score = data.thread.votes?.reduce((s,v)=>s+v.value,0) || 0;

  return <main className="container">
    <article className="card detail">
      <div className="vote-box">
        <button onClick={()=>vote(1)}>▲</button><strong>{score}</strong><button onClick={()=>vote(-1)}>▼</button>
      </div>
      <div className="grow">
        <h1>{data.thread.title}</h1>
        <p className="body-text">{data.thread.body}</p>
        {data.thread.tags?.map(tag=><span className="tag" key={tag}>#{tag}</span>)}
        <div className="meta">Asked by {data.thread.author?.name} · {new Date(data.thread.createdAt).toLocaleString()}</div>
      </div>
    </article>

    <h2>{data.replies.length} Answers</h2>
    {data.replies.map(r=><article className={`card reply ${r.accepted ? "accepted":""}`} key={r._id}>
      {r.accepted && <div className="accepted-label">✓ Accepted answer</div>}
      <p className="body-text">{r.body}</p>
      <div className="meta">By {r.author?.name} · {new Date(r.createdAt).toLocaleString()}</div>
      {user && (data.thread.author?._id === user.id || ["moderator","admin"].includes(user.role)) && !r.accepted &&
        <button onClick={()=>accept(r._id)}>Accept answer</button>}
    </article>)}

    {user ? <form className="card form" onSubmit={addReply}>
      <h3>Your Answer</h3>
      <textarea required rows="6" value={reply} onChange={e=>setReply(e.target.value)} placeholder="Write your answer..."/>
      <button className="button">Post Answer</button>
    </form> : <div className="card">Login to post an answer.</div>}
  </main>;
}

function Notifications() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/notifications").then(r=>setItems(r.data)); }, []);
  return <main className="container"><h1>Notifications</h1>
    {items.map(n=><div className={`card notification ${n.read ? "" : "unread"}`} key={n._id}>{n.message}<div className="meta">{new Date(n.createdAt).toLocaleString()}</div></div>)}
    {!items.length && <div className="card">No notifications yet.</div>}
  </main>;
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));

  return <>
    <Layout user={user} setUser={setUser}/>
    <Routes>
      <Route path="/" element={<Home user={user}/>}/>
      <Route path="/login" element={<Auth mode="login" setUser={setUser}/>}/>
      <Route path="/register" element={<Auth mode="register" setUser={setUser}/>}/>
      <Route path="/create" element={<Create/>}/>
      <Route path="/threads/:id" element={<ThreadPage user={user}/>}/>
      <Route path="/notifications" element={<Notifications/>}/>
    </Routes>
    <footer>Discussion Forum · Full Stack Development Project</footer>
  </>;
}
