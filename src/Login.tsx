import React, { useState } from 'react'
import /*instance,*/ { login } from './api/instance';

function Login() {
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { target: { name, value } } = e;
    if (name === "name") {
      setName(value);
    } else if (name === "password") {
      setPassword(value);
    }
  }
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await login(name, password)

      // const { access, refresh } = res.data;
      // if (access) {
      //   console.log(access)
      //   document.cookie = `accessToken=${access}; path=/`;
      // }
      // if (refresh) {
      //   sessionStorage.setItem('refreshToken', refresh);
      // }

    } catch (error) {
      console.error('There was an error!', error);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>이름</div>
        <input onChange={handleChange} name='name' value={name} required />
        <div>비밀번호</div>
        <input onChange={handleChange} name='password' value={password} required />
        <button type='submit'>제출</button>
      </form>
    </div>
  )
}

export default Login