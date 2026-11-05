import{r as e}from"./rolldown-runtime-hePW80VL.js";import{a as t}from"./vendor-react-JxWQaBUa.js";import{p as n}from"./vendor-charts-CyPRMOav.js";import{t as r}from"./PrimaryButton-1qCHEecj.js";import{t as i}from"./SecondaryButton-CZN8k9SK.js";import{t as a}from"./Modal-0tvWtlgI.js";var o=e(n(),1),s=t();function c({show:e,onClose:t,qrUrl:n}){let[c,l]=(0,o.useState)(!1),u=(0,o.useRef)(null);return(0,o.useEffect)(()=>(e||(u.current!==null&&clearTimeout(u.current),u.current=null,l(!1)),()=>{u.current!==null&&clearTimeout(u.current),u.current=null}),[e]),(0,s.jsx)(a,{show:e,onClose:t,maxWidth:`md`,children:(0,s.jsxs)(`div`,{className:`p-6`,children:[(0,s.jsxs)(`div`,{className:`flex items-start justify-between border-b border-slate-100 pb-4`,children:[(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`h2`,{className:`text-lg font-bold text-slate-900`,children:`Security Post Shared QR Code`}),(0,s.jsx)(`p`,{className:`mt-1 text-xs text-slate-500`,children:`Shared entry point placed on the hotel Security post desk directly linking to the Borrowing Form.`})]}),(0,s.jsx)(`button`,{type:`button`,onClick:t,className:`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors`,children:(0,s.jsx)(`svg`,{className:`h-5 w-5`,fill:`none`,viewBox:`0 0 24 24`,stroke:`currentColor`,children:(0,s.jsx)(`path`,{strokeLinecap:`round`,strokeLinejoin:`round`,strokeWidth:2,d:`M6 18L18 6M6 6l12 12`})})})]}),(0,s.jsxs)(`div`,{id:`qr-printable-area`,className:`mt-5 text-center`,children:[(0,s.jsx)(`div`,{className:`inline-block p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-sm`,children:(0,s.jsx)(`img`,{src:`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(n)}`,alt:`Room Borrowing QR Code`,className:`w-48 h-48 mx-auto`,width:`192`,height:`192`})}),(0,s.jsxs)(`div`,{className:`mt-3`,children:[(0,s.jsx)(`span`,{className:`text-xs font-semibold text-slate-500 block`,children:`Direct Borrowing Form Link:`}),(0,s.jsxs)(`div`,{className:`mt-1 inline-flex items-center gap-2 max-w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700`,children:[(0,s.jsx)(`span`,{className:`truncate`,children:n}),(0,s.jsx)(`button`,{type:`button`,onClick:()=>{navigator.clipboard.writeText(n),l(!0),u.current!==null&&clearTimeout(u.current),u.current=setTimeout(()=>{u.current=null,l(!1)},2500)},className:`text-slate-500 hover:text-[#E31B23] transition-colors shrink-0`,title:`Copy Link`,children:c?(0,s.jsx)(`span`,{className:`text-[11px] font-semibold text-emerald-600`,children:`Copied!`}):(0,s.jsx)(`svg`,{className:`w-4 h-4`,fill:`none`,viewBox:`0 0 24 24`,stroke:`currentColor`,children:(0,s.jsx)(`path`,{strokeLinecap:`round`,strokeLinejoin:`round`,strokeWidth:2,d:`M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z`})})})]})]}),(0,s.jsxs)(`div`,{className:`mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-left text-xs text-slate-600 space-y-1.5`,children:[(0,s.jsxs)(`div`,{className:`font-semibold text-slate-900 flex items-center gap-1.5`,children:[(0,s.jsx)(`svg`,{className:`w-4 h-4 text-[#E31B23]`,fill:`none`,viewBox:`0 0 24 24`,stroke:`currentColor`,children:(0,s.jsx)(`path`,{strokeLinecap:`round`,strokeLinejoin:`round`,strokeWidth:2,d:`M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z`})}),`Security Post QR Code Guide:`]}),(0,s.jsxs)(`p`,{children:[`Print and place this QR code on the Security desk stand. Staff members can quickly scan this QR code with their mobile device to open the `,(0,s.jsx)(`strong`,{children:`Room & Key Borrowing Form`}),` instantly without manual menu navigation.`]})]})]}),(0,s.jsxs)(`div`,{className:`mt-6 flex items-center justify-between border-t border-slate-100 pt-4`,children:[(0,s.jsx)(i,{type:`button`,onClick:t,children:`Close`}),(0,s.jsx)(`div`,{className:`flex items-center gap-2`,children:(0,s.jsxs)(r,{type:`button`,onClick:()=>{if(!document.getElementById(`qr-printable-area`))return;let e=window.open(``,`_blank`);e&&(e.document.write(`
            <html>
                <head>
                    <title>SIPU - Security Post Room Borrowing QR Code</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 40px; text-align: center; color: #0F172A; }
                        .card { max-width: 460px; margin: 0 auto; border: 2px solid #E2E8F0; border-radius: 24px; padding: 36px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
                        .logo-area { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
                        .brand-title { font-size: 20px; font-weight: 800; color: #E31B23; margin: 0; }
                        .brand-sub { font-size: 13px; color: #64748B; margin: 2px 0 0 0; }
                        .qr-box { background: #FFFFFF; border: 3px solid #E31B23; border-radius: 20px; padding: 20px; display: inline-block; margin: 16px 0; }
                        .steps { text-align: left; background: #F8FAFC; border-radius: 16px; padding: 18px 22px; margin-top: 24px; border: 1px solid #E2E8F0; font-size: 13px; line-height: 1.6; }
                        .steps ol { margin: 0; padding-left: 20px; }
                        .steps li { margin-bottom: 6px; }
                        .footer { margin-top: 24px; font-size: 11px; color: #94A3B8; }
                        @media print { body { padding: 0; } .card { border: none; box-shadow: none; } }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="logo-area">
                            <div>
                                <h1 class="brand-title">SWISS-BELINN SKA PEKANBARU</h1>
                                <p class="brand-sub">SIPU Management System • Security Post & Key Center</p>
                            </div>
                        </div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 6px 0;">HOTEL ROOM & KEY BORROWING</h2>
                        <p style="font-size: 13px; color: #475569; margin: 0;">Scan the QR code below using your mobile device camera</p>
                        <div class="qr-box">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(n)}" width="220" height="220" alt="Room Borrowing QR Code" />
                        </div>
                        <p style="font-size: 12px; font-family: monospace; color: #E31B23; font-weight: bold; margin: 0;">${n}</p>
                        <div class="steps">
                            <strong style="display: block; margin-bottom: 8px; color: #0F172A;">Key Borrowing & Return Procedure:</strong>
                            <ol>
                                <li><strong>Scan the QR Code</strong> with your phone camera and log in to the SIPU system.</li>
                                <li>Select your desired room on the <strong>Borrowing Form</strong> (ensure status is <strong>Available</strong>).</li>
                                <li>Specify duration and purpose, then tap <strong>Confirm & Submit Key Loan Request</strong>.</li>
                                <li>Present the confirmation screen to the Security officer to collect the physical key.</li>
                                <li>After your session concludes, tap <strong>Request Key Return</strong> in My Borrowings and return the physical key to Security.</li>
                            </ol>
                        </div>
                        <div class="footer">
                            Swiss-Belinn SKA Pekanbaru • Internal SOP Security & Facilities
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    <\/script>
                </body>
            </html>
        `),e.document.close())},className:`bg-[#E31B23] hover:bg-[#C4141B]`,children:[(0,s.jsx)(`svg`,{className:`w-4 h-4 mr-1.5`,fill:`none`,viewBox:`0 0 24 24`,stroke:`currentColor`,children:(0,s.jsx)(`path`,{strokeLinecap:`round`,strokeLinejoin:`round`,strokeWidth:2,d:`M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z`})}),`Print Security Desk Stand`]})})]})]})})}export{c as default};